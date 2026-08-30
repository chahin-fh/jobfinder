import { json, type RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	const supabase = event.locals.supabase;

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const uid = session.user.id;

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
		const msg = [skills.error, portfolio.error, languages.error, reviews.error]
			.find((e) => e)?.message;
		return json({ error: msg ?? 'Failed to load profile' }, { status: 500 });
	}

	return json({
		profile: {
			...profile,
			skills: skills.data ?? [],
			portfolio: portfolio.data ?? [],
			languages: (languages.data ?? []).map((l: { name: string }) => l.name),
			reviews: (reviews.data ?? []).map((r) => ({
				reviewerName: r.reviewer_name,
				reviewerRole: r.reviewer_role,
				rating: r.rating,
				date: r.review_date,
				text: r.text
			}))
		}
	});
}

export async function PUT(event: RequestEvent) {
	const supabase = event.locals.supabase;

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const uid = session.user.id;
	const body = await event.request.json().catch(() => ({}));

	const name = typeof body.name === 'string' ? body.name.trim().slice(0, 40) : '';
	if (!name) {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	const role = body.role === 'client' ? 'client' : 'freelancer';
	const bio = typeof body.bio === 'string' ? body.bio.trim().slice(0, 600) : null;
	const title = typeof body.title === 'string' ? body.title.trim().slice(0, 80) : null;
	const location = typeof body.location === 'string' ? body.location.trim().slice(0, 60) : null;

	const { error: profileError } = await supabase.from('profiles').upsert(
		{
			id: uid,
			name,
			role,
			title,
			bio,
			location,
			hourly_rate: Number(body.hourlyRate) || 0,
			availability: typeof body.availability === 'string' ? body.availability : 'Available now',
			verified: Boolean(body.verified),
			jobs_done: Number(body.stats?.jobs) || 0,
			success_rate: Number(body.stats?.successRate) || 0,
			response_time: typeof body.stats?.responseTime === 'string' ? body.stats.responseTime : '1h'
		},
		{ onConflict: 'id' }
	);

	if (profileError) {
		return json({ error: profileError.message }, { status: 500 });
	}

	// Replace child lists (delete-all + re-insert keeps ordering simple)
	const deletes = await Promise.all([
		supabase.from('profile_skills').delete().eq('profile_id', uid),
		supabase.from('profile_portfolio').delete().eq('profile_id', uid),
		supabase.from('profile_languages').delete().eq('profile_id', uid),
		supabase.from('profile_reviews').delete().eq('profile_id', uid)
	]);

	const deleteError = deletes.find((r) => r.error)?.error;
	if (deleteError) {
		return json({ error: deleteError.message }, { status: 500 });
	}

	const skills = Array.isArray(body.skills) ? body.skills : [];
	const portfolio = Array.isArray(body.portfolio) ? body.portfolio : [];
	const languages = Array.isArray(body.languages) ? body.languages : [];
	const reviews = Array.isArray(body.reviews) ? body.reviews : [];

	const inserts = await Promise.all([
		skills.length
			? supabase.from('profile_skills').insert(						skills
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
			? supabase.from('profile_portfolio').insert(						portfolio.map((p: any, i: number) => ({
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
			: Promise.resolve({ error: null }),
		reviews.length
			? supabase.from('profile_reviews').insert(
					reviews.map((r: any, i: number) => ({
						profile_id: uid,
						reviewer_name: String(r.reviewerName ?? '').trim().slice(0, 40) || 'Anonymous',
						reviewer_role: String(r.reviewerRole ?? '').trim().slice(0, 40),
						rating: Math.min(5, Math.max(1, Number(r.rating) || 5)),
						review_date: String(r.date ?? '').trim().slice(0, 12),
						text: String(r.text ?? '').trim().slice(0, 400),
						sort_order: i
					}))
				)
			: Promise.resolve({ error: null })
	]);

	const insertError = inserts.find((r) => r.error)?.error;
	if (insertError) {
		return json({ error: insertError.message }, { status: 500 });
	}

	return json({ success: true });
}
