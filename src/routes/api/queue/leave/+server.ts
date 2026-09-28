import { json, type RequestEvent } from '@sveltejs/kit';
import { requireUser, unauthorized } from '$lib/server/auth';

export async function POST(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;

	const { error } = await supabase
		.from('queue_entries')
		.update({ status: 'cancelled' })
		.eq('user_id', user.id)
		.eq('status', 'waiting');

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ success: true });
}
