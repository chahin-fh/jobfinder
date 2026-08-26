import { json, type RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	const supabase = event.locals.supabase;

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	// Fetch all matches (conversations) for the current user
	const { data: matches, error } = await supabase
		.from('matches')
		.select(`
			id,
			created_at,
			category:categories(name, icon),
			client:profiles!client_id(id, name),
			freelancer:profiles!freelancer_id(id, name),
			client_id,
			freelancer_id
		`)
		.or(`client_id.eq.${session.user.id},freelancer_id.eq.${session.user.id}`)
		.order('created_at', { ascending: false });

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	// Fetch last message for each conversation
	const conversations = await Promise.all(
		(matches ?? []).map(async (match: any) => {
			const otherUser =
				match.client_id === session.user.id ? match.freelancer : match.client;
			const otherUserId =
				match.client_id === session.user.id ? match.freelancer_id : match.client_id;

			// Get last message
			const { data: lastMsg } = await supabase
				.from('chat_messages')
				.select('text, created_at')
				.eq('match_id', match.id)
				.order('created_at', { ascending: false })
				.limit(1)
				.single();

			// Get unread count (messages from other user after last read)
			const { count: unreadCount } = await supabase
				.from('chat_messages')
				.select('*', { count: 'exact', head: true })
				.eq('match_id', match.id)
				.neq('sender_id', session.user.id);

			// Format time ago
			let lastMessageTime = '';
			if (lastMsg) {
				const diff = Date.now() - new Date(lastMsg.created_at).getTime();
				const minutes = Math.floor(diff / 60000);
				const hours = Math.floor(diff / 3600000);
				const days = Math.floor(diff / 86400000);
				if (minutes < 1) lastMessageTime = 'Just now';
				else if (minutes < 60) lastMessageTime = `${minutes}m ago`;
				else if (hours < 24) lastMessageTime = `${hours}h ago`;
				else lastMessageTime = `${days}d ago`;
			}

			return {
				id: match.id,
				participantName: otherUser?.name ?? 'Unknown',
				participantId: otherUserId ?? '',
				category: match.category?.name ?? 'General',
				categoryIcon: match.category?.icon ?? '💬',
				lastMessage: lastMsg?.text ?? 'No messages yet',
				lastMessageTime: lastMessageTime || 'New',
				unreadCount: unreadCount ?? 0,
				online: false // Could be enhanced with presence tracking
			};
		})
	);

	return json({ conversations });
}
