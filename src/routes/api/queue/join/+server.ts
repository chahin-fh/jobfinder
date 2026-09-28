import { json, type RequestEvent } from '@sveltejs/kit';
import { requireUser, unauthorized } from '$lib/server/auth';
import { firstRow, matchPayload, type TryMatchRow } from '$lib/server/matching';

export async function POST(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;

	const body = await event.request.json().catch(() => ({}));
	const role = body.role === 'client' || body.role === 'freelancer' ? body.role : null;
	const categoryIds: unknown = body.category_ids;

	if (!role || !Array.isArray(categoryIds) || categoryIds.length === 0) {
		return json({ error: 'Role and category_ids are required' }, { status: 400 });
	}

	// Keep the stored profile in sync with the role the user just picked.
	const { error: profileError } = await supabase.from('profiles').upsert(
		{
			id: user.id,
			name: user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'User',
			role
		},
		{ onConflict: 'id' }
	);

	if (profileError) {
		return json({ error: profileError.message }, { status: 500 });
	}

	const { data: existing } = await supabase
		.from('queue_entries')
		.select('id')
		.eq('user_id', user.id)
		.eq('status', 'waiting')
		.maybeSingle();

	if (existing) {
		return json({ error: 'Already in queue' }, { status: 409 });
	}

	const { data: queueEntry, error: queueError } = await supabase
		.from('queue_entries')
		.insert({
			user_id: user.id,
			role,
			category_ids: categoryIds
		})
		.select()
		.single();

	if (queueError) {
		return json({ error: queueError.message }, { status: 500 });
	}

	// All matching happens inside one atomic, server-side function: it respects
	// RLS-safe privacy (no cross-user reads), skips locked rows and can't create
	// a duplicate match for the same pair + category.
	const { data: rows, error: matchError } = await supabase.rpc('try_match', {
		p_user_id: user.id,
		p_role: role,
		p_category_ids: categoryIds
	});

	if (matchError) {
		return json({ error: matchError.message }, { status: 500 });
	}

	const matched = firstRow<TryMatchRow>(rows);
	if (matched) {
		return json({ matched: true, match: matchPayload(matched, role) });
	}

	return json({ matched: false, queueEntry });
}
