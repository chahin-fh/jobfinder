import { json, type RequestEvent } from '@sveltejs/kit';
import { requireUser, unauthorized } from '$lib/server/auth';
import { firstRow, matchPayload, type TryMatchRow } from '$lib/server/matching';

export async function POST(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;

	// maybeSingle + explicit ordering: a user can legitimately have more than one
	// historical entry, and `.single()` would error on that.
	const { data: myEntry } = await supabase
		.from('queue_entries')
		.select('id, role, category_ids, status')
		.eq('user_id', user.id)
		.eq('status', 'waiting')
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (!myEntry) {
		return json({ matched: false, reason: 'Not in queue' });
	}

	const { data: rows, error } = await supabase.rpc('try_match', {
		p_user_id: user.id,
		p_role: myEntry.role,
		p_category_ids: myEntry.category_ids
	});

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	const matched = firstRow<TryMatchRow>(rows);
	if (matched) {
		return json({ matched: true, match: matchPayload(matched, myEntry.role) });
	}

	return json({ matched: false });
}
