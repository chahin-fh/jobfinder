import { json, type RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	const supabase = event.locals.supabase;

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const { error } = await supabase
		.from('queue_entries')
		.update({ status: 'cancelled' })
		.eq('user_id', session.user.id)
		.eq('status', 'waiting');

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ success: true });
}
