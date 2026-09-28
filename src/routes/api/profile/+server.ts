import { json, type RequestEvent } from '@sveltejs/kit';
import { requireUser, unauthorized } from '$lib/server/auth';

export async function GET(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;
	const uid = user.id;

	const { data: profile, error } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', uid)
		.maybeSingle();

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	if (!profile) {
		return json({ profile: null });
	}

	const [skills, portfolio, languages, reviews] = await Promise.all([
		supabase
			.from('profile_skills')
			.select('name, icon, level')
			.eq('profile_id', uid)
			.order('sort_order'),
		supabase
			.from('profile_portfolio')
			.select('title, category, icon, year, blurb, gradient')
			.eq('profile_id', uid)
			.order('sort_order'),
		supabase.from('profile_languages').select('name').eq('profile_id', uid).order('sort_order'),
		supabase
			.from('profile_reviews')
			.select('reviewer_name, reviewer_role, rating, review_date, text')
			.eq('profile_id', uid)
			.order('sort_order')
	]);

	if (skills.error || portfolio.error || languages.error || reviews.error) {
		const msg = [skills.error, portfolio.error, languages.error, reviews.error].find((e) => e)
			?.message;
		return json({ error: msg ?? 'Failed to load profile' }, { status: 500 });
	}

	return json({
		profile: {
			...profile,
			skills: skills.data ?? [],
			portfolio: portfolio.data ?? [],
			languages: (languages.data ?? []).map((l: { name: string }) => l.name),
			reviews: (reviews.data ?? []).map((r: any) => ({
				reviewerName: r.reviewer_name,
				reviewerRole: r.reviewer_role,
				rating: r.rating,
				date: r.review_date,
				text: r.text
			}))
		}
	});
}

/**
 * Saves the profile.
 *
 * Trust-bearing fields are intentionally NOT writable here:
 *  - `verified` is admin-controlled
 *  - `jobs_done` is derived from confirmed matches
 *  - `success_rate` / `response_time` are left to a future aggregation job
 *  - reviews are earned through /api/matches/[id]/review, never self-authored
 */
export async function PUT(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;
	const uid = user.id;
	const body = await event.request.json().catch(() => ({}));

	const name = typeof body.name === 'string' ? body.name.trim().slice(0, 40) : '';
	if (!name) {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	const role = body.role === 'client' ? 'client' : 'freelancer';
	const bio = typeof body.bio === 'string' ? body.bio.trim().slice(0, 600) : null;
	const title = typeof body.title === 'string' ? body.title.trim().slice(0, 80) : null;
	const location = typeof body.location === 'string' ? body.location.trim().slice(0, 60) : null;
	const availability =
		typeof body.availability === 'string' && body.availability.trim()
			? body.availability.trim().slice(0, 40)
			: 'Available now';
	const hourlyRate = Math.max(0, Math.min(9999, Number(body.hourlyRate) || 0));

	// Jobs done is evidence-based, not user-authored.
	const { count: jobsDone } = await supabase
		.from('matches')
		.select('id', { count: 'exact', head: true })
		.eq('status', 'confirmed')
		.or(`client_id.eq.${uid},freelancer_id.eq.${uid}`);

	const patch: Record<string, unknown> = {
		id: uid,
		name,
		role,
		title,
		bio,
		location,
		hourly_rate: hourlyRate,
		availability,
		jobs_done: jobsDone ?? 0
	};

	if (typeof body.avatar_url === 'string') {
		const url = body.avatar_url.trim();
		// Only allow real http(s) urls (the Storage public URL we hand out).
		patch.avatar_url = /^https:\/\//.test(url) ? url.slice(0, 500) : null;
	}

	const { error: profileError } = await supabase
		.from('profiles')
		.upsert(patch, { onConflict: 'id' });

	if (profileError) {
		return json({ error: profileError.message }, { status: 500 });
	}

	// Replace child lists (delete-all + re-insert keeps ordering simple).
	// profile_reviews is deliberately excluded: reviews are written by the
	// counterparty and mirrored in by a database trigger.
	const deletes = await Promise.all([
		supabase.from('profile_skills').delete().eq('profile_id', uid),
		supabase.from('profile_portfolio').delete().eq('profile_id', uid),
		supabase.from('profile_languages').delete().eq('profile_id', uid)
	]);

	const deleteError = deletes.find((r) => r.error)?.error;
	if (deleteError) {
		return json({ error: deleteError.message }, { status: 500 });
	}

	const skills = Array.isArray(body.skills) ? body.skills : [];
	const portfolio = Array.isArray(body.portfolio) ? body.portfolio : [];
	const languages = Array.isArray(body.languages) ? body.languages : [];

	const inserts = await Promise.all([
		skills.length
			? supabase.from('profile_skills').insert(
					skills
						.map((s: any) => ({ ...s, name: String(s.name ?? '').trim().slice(0, 40) }))
						.filter((s: any) => s.name)
						.map((s: any, i: number) => ({
							profile_id: uid,
							name: s.name,
							icon: s.icon || '🛠️',
							level: Math.min(100, Math.max(0, Number(s.level) || 0)),
							sort_order: i
						}))
				)
			: Promise.resolve({ error: null }),
		portfolio.length
			? supabase.from('profile_portfolio').insert(
					portfolio.map((p: any, i: number) => ({
						profile_id: uid,
						title: String(p.title ?? '').trim().slice(0, 60) || 'Untitled',
						category: String(p.category ?? '').trim().slice(0, 30) || 'Web App',
						icon: p.icon || '💻',
						year: Number(p.year) || null,
						blurb: String(p.blurb ?? '').trim().slice(0, 160),
						gradient: p.gradient || 'g1',
						sort_order: i
					}))
				)
			: Promise.resolve({ error: null }),
		languages.length
			? supabase.from('profile_languages').insert(
					languages
						.map((lang: string) => String(lang).trim().slice(0, 40))
						.filter(Boolean)
						.map((name: string, i: number) => ({ profile_id: uid, name, sort_order: i }))
				)
			: Promise.resolve({ error: null })
	]);

	const insertError = inserts.find((r) => r.error)?.error;
	if (insertError) {
		return json({ error: insertError.message }, { status: 500 });
	}

	return json({ success: true });
}
