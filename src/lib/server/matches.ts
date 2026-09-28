import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRole } from '$lib/types';

export interface MatchRow {
	id: string;
	client_id: string;
	freelancer_id: string;
	category_id: string;
	status: string;
}

/**
 * Loads a match only if `userId` is one of its two participants.
 * Returns null otherwise, so routes can answer 404 without leaking existence.
 */
export async function loadMatchForUser(
	supabase: SupabaseClient,
	matchId: string | undefined,
	userId: string
): Promise<MatchRow | null> {
	if (!matchId) return null;

	const { data } = await supabase
		.from('matches')
		.select('id, client_id, freelancer_id, category_id, status')
		.eq('id', matchId)
		.or(`client_id.eq.${userId},freelancer_id.eq.${userId}`)
		.maybeSingle();

	return (data as MatchRow | null) ?? null;
}

/** Which side of the match the given user is on. */
export function roleInMatch(match: MatchRow, userId: string): UserRole {
	return match.client_id === userId ? 'client' : 'freelancer';
}

/** The other participant's user id. */
export function counterpartId(match: MatchRow, userId: string): string {
	return match.client_id === userId ? match.freelancer_id : match.client_id;
}
