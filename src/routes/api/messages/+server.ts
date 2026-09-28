import { json, type RequestEvent } from '@sveltejs/kit';
import { requireUser, unauthorized } from '$lib/server/auth';
import { peopleFor } from '$lib/server/profiles';
import { relativeTime } from '$lib/format';

/** Lists every conversation for the current user, newest activity first. */
export async function GET(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;

	const { data: matches, error } = await supabase
		.from('matches')
		.select('id, status, created_at, client_id, freelancer_id, category:categories(name, icon)')
		.or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
		.order('created_at', { ascending: false });

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	const rows = (matches ?? []) as any[];
	const matchIds = rows.map((m) => m.id);

	const { data: readRows } = matchIds.length
		? await supabase
				.from('match_reads')
				.select('match_id, last_read_at')
				.eq('user_id', user.id)
				.in('match_id', matchIds)
		: { data: [] as any[] };

	const { data: messageRows } = matchIds.length
		? await supabase
				.from('chat_messages')
				.select('match_id, sender_id, text, created_at')
				.in('match_id', matchIds)
				.order('created_at', { ascending: false })
		: { data: [] as any[] };

	const people = await peopleFor(
		supabase,
		rows.map((m) => (m.client_id === user.id ? m.freelancer_id : m.client_id))
	);

	const reads = new Map<string, string>(
		((readRows ?? []) as any[]).map((r) => [r.match_id, r.last_read_at] as const)
	);

	const byMatch = new Map<string, any[]>();
	for (const message of (messageRows ?? []) as any[]) {
		const list = byMatch.get(message.match_id) ?? [];
		list.push(message);
		byMatch.set(message.match_id, list);
	}

	const conversations = rows.map((match) => {
		const otherId = match.client_id === user.id ? match.freelancer_id : match.client_id;
		const other = people.get(otherId);
		// Rows are ordered newest-first, so index 0 is the latest message.
		const messages = byMatch.get(match.id) ?? [];
		const last = messages[0];
		const lastRead = reads.get(match.id);

		const unreadCount = messages.filter(
			(m) =>
				m.sender_id !== user.id &&
				(!lastRead || new Date(m.created_at).getTime() > new Date(lastRead).getTime())
		).length;

		const category = Array.isArray(match.category) ? match.category[0] : match.category;

		return {
			id: match.id,
			participantName: other?.name ?? 'Unknown',
			participantId: otherId,
			participantAvatar: other?.avatar_url ?? null,
			category: category?.name ?? 'General',
			categoryIcon: category?.icon ?? '💬',
			status: match.status,
			lastMessage: last?.text ?? 'No messages yet',
			lastMessageTime: relativeTime(last?.created_at),
			lastMessageAt: last?.created_at ?? match.created_at,
			unreadCount,
			online: false
		};
	});

	conversations.sort((a, b) =>
		String(b.lastMessageAt ?? '').localeCompare(String(a.lastMessageAt ?? ''))
	);

	return json({ conversations });
}
