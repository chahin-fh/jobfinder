import { json, type RequestEvent } from '@sveltejs/kit';
import { requireUser, unauthorized } from '$lib/server/auth';

/**
 * Public freelancer directory.
 *
 * Reads the `public_profiles` view, which exposes only presentational columns
 * (no emails, no is_admin) to signed-in users.
 */
export async function GET(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase } = auth;

	const q = (event.url.searchParams.get('q') ?? '').trim().slice(0, 60);
	const limit = Math.min(60, Math.max(1, Number(event.url.searchParams.get('limit')) || 24));

	let query = supabase
		.from('public_profiles')
		.select(
			'id, name, title, bio, location, hourly_rate, availability, verified, jobs_done, success_rate, response_time, avatar_url, created_at'
		)
		.eq('role', 'freelancer')
		.order('jobs_done', { ascending: false })
		.order('created_at', { ascending: false })
		.limit(limit);

	if (q) {
		const escaped = q.replace(/[%_\\]/g, '\\$&');
		query = query.or(
			`name.ilike.%${escaped}%,title.ilike.%${escaped}%,location.ilike.%${escaped}%`
		);
	}

	const { data, error } = await query;

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	const rows = (data ?? []) as any[];
	const ids = rows.map((r) => r.id);

	const { data: skillRows } = ids.length
		? await supabase
				.from('public_skills')
				.select('profile_id, name, icon, level, sort_order')
				.in('profile_id', ids)
				.order('sort_order')
		: { data: [] as any[] };

	const byProfile = new Map<string, any[]>();
	for (const skill of (skillRows ?? []) as any[]) {
		const list = byProfile.get(skill.profile_id) ?? [];
		list.push({ name: skill.name, icon: skill.icon, level: skill.level });
		byProfile.set(skill.profile_id, list);
	}

	return json({
		freelancers: rows.map((r) => ({
			...r,
			skills: (byProfile.get(r.id) ?? []).slice(0, 5)
		}))
	});
}
