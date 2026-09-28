import { json, type RequestEvent } from '@sveltejs/kit';
import { requireUser, unauthorized } from '$lib/server/auth';

export async function GET(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;

	const { data, error } = await supabase
		.from('queue_entries')
		.select('id, role, category_ids, status, created_at, expires_at')
		.eq('user_id', user.id)
		.eq('status', 'waiting')
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ inQueue: !!data, queueEntry: data ?? null });
}
