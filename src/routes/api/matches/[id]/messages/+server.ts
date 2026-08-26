import { json, type RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	const supabase = event.locals.supabase;

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const matchId = event.params.id;

	const { data, error } = await supabase
		.from('chat_messages')
		.select('*, sender:profiles!sender_id(name)')
		.eq('match_id', matchId)
		.order('created_at', { ascending: true });

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ messages: data });
}

export async function POST(event: RequestEvent) {
	const supabase = event.locals.supabase;

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const matchId = event.params.id;
	const { text } = await event.request.json();

	if (!text?.trim()) {
		return json({ error: 'Message text is required' }, { status: 400 });
	}

	const { data, error } = await supabase
		.from('chat_messages')
		.insert({
			match_id: matchId,
			sender_id: session.user.id,
			text: text.trim()
		})
		.select('*, sender:profiles!sender_id(name)')
		.single();

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ message: data });
}
