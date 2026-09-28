import { json, type RequestEvent } from '@sveltejs/kit';
import { requireUser, unauthorized } from '$lib/server/auth';
import { peopleFor } from '$lib/server/profiles';

export async function GET(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;

	const { data, error } = await supabase
		.from('matches')
		.select('*, category:categories(*)')
		.or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
		.order('created_at', { ascending: false });

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	const rows = (data ?? []) as any[];

	// Direct profile joins are blocked by RLS, so names come from the public
	// directory view instead.
	const people = await peopleFor(
		supabase,
		rows.flatMap((m) => [m.client_id, m.freelancer_id])
	);

	const matches = rows.map((m) => ({
		...m,
		client: people.get(m.client_id) ?? { id: m.client_id, name: 'User', avatar_url: null },
		freelancer:
			people.get(m.freelancer_id) ?? { id: m.freelancer_id, name: 'User', avatar_url: null }
	}));

	return json({ matches });
}
