import { json, type RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	const supabase = event.locals.supabase;

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const { data, error } = await supabase
		.from('queue_entries')
		.select('*, profiles!inner(name)')
		.eq('user_id', session.user.id)
		.eq('status', 'waiting')
		.single();

	if (error && error.code !== 'PGRST116') {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ inQueue: !!data, queueEntry: data });
}
