import { json, type RequestEvent } from '@sveltejs/kit';
import { requireUser, unauthorized } from '$lib/server/auth';
import { counterpartId, loadMatchForUser } from '$lib/server/matches';

/**
 * Leaves a review for the other participant of a confirmed match.
 * Users cannot review themselves and cannot review twice (DB unique constraint).
 */
export async function POST(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;

	const match = await loadMatchForUser(supabase, event.params.id, user.id);
	if (!match) return json({ error: 'Match not found' }, { status: 404 });

	if (match.status !== 'confirmed') {
		return json(
			{ error: 'You can review a partner once the engagement is confirmed' },
			{ status: 400 }
		);
	}

	const body = await event.request.json().catch(() => ({}));
	const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating) || 0)));
	const text = typeof body.text === 'string' ? body.text.trim().slice(0, 1000) : '';

	if (!rating) {
		return json({ error: 'A rating between 1 and 5 is required' }, { status: 400 });
	}

	const { data, error } = await supabase
		.from('match_reviews')
		.insert({
			match_id: match.id,
			author_id: user.id,
			subject_id: counterpartId(match, user.id),
			rating,
			text
		})
		.select()
		.single();

	if (error) {
		if (error.code === '23505') {
			return json({ error: 'You already reviewed this partner' }, { status: 409 });
		}
		return json({ error: error.message }, { status: 500 });
	}

	return json({ review: data }, { status: 201 });
}
