import { json, type RequestEvent } from '@sveltejs/kit';
import { requireUser, unauthorized } from '$lib/server/auth';
import { loadMatchForUser } from '$lib/server/matches';

/** Marks a match as read for the current user (drives the unread badges). */
export async function POST(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;

	const match = await loadMatchForUser(supabase, event.params.id, user.id);
	if (!match) return json({ error: 'Match not found' }, { status: 404 });

	const { error } = await supabase
		.from('match_reads')
		.upsert(
			{ match_id: match.id, user_id: user.id, last_read_at: new Date().toISOString() },
			{ onConflict: 'match_id,user_id' }
		);

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ success: true });
}
