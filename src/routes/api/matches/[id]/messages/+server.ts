import { json, type RequestEvent } from '@sveltejs/kit';
import { requireUser, unauthorized } from '$lib/server/auth';
import { loadMatchForUser } from '$lib/server/matches';
import { namesFor } from '$lib/server/profiles';
import { emailMatchPartner } from '$lib/server/email';

const MAX_MESSAGE_LENGTH = 4000;

export async function GET(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;

	const match = await loadMatchForUser(supabase, event.params.id, user.id);
	if (!match) return json({ error: 'Match not found' }, { status: 404 });

	const { data, error } = await supabase
		.from('chat_messages')
		.select('id, match_id, sender_id, text, created_at')
		.eq('match_id', match.id)
		.order('created_at', { ascending: true });

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	const rows = (data ?? []) as any[];
	const names = await namesFor(
		supabase,
		rows.map((m) => m.sender_id)
	);

	return json({
		messages: rows.map((m) => ({ ...m, sender_name: names.get(m.sender_id) ?? 'User' })),
		status: match.status
	});
}

export async function POST(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;

	const match = await loadMatchForUser(supabase, event.params.id, user.id);
	if (!match) return json({ error: 'Match not found' }, { status: 404 });

	const body = await event.request.json().catch(() => ({}));
	const text = typeof body.text === 'string' ? body.text.trim() : '';

	if (!text) {
		return json({ error: 'Message text is required' }, { status: 400 });
	}

	if (text.length > MAX_MESSAGE_LENGTH) {
		return json({ error: 'Message is too long' }, { status: 400 });
	}

	const { data, error } = await supabase
		.from('chat_messages')
		.insert({
			match_id: match.id,
			sender_id: user.id,
			text
		})
		.select('id, match_id, sender_id, text, created_at')
		.single();

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	// Best-effort email notification - a no-op until RESEND_API_KEY is set.
	const senderName = user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Someone';
	await emailMatchPartner(supabase, match.id, {
		subject: `New message from ${senderName} on JobFinder`,
		text: `${senderName} sent you a message:\n\n"${text.slice(0, 500)}"\n\nReply here: ${event.url.origin}/messages`
	});

	return json({ message: { ...data, sender_name: senderName } });
}
