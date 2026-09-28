import type { MatchResult, UserRole } from '$lib/types';

/** Row shape returned by the `try_match` SQL function. */
export interface TryMatchRow {
	match_id: string;
	counterpart_id: string;
	counterpart_name: string | null;
	category_id: string;
	category_name: string | null;
	category_icon: string | null;
	category_description: string | null;
}

/** `supabase.rpc()` returns a set function's rows as an array. */
export function firstRow<T>(data: T[] | T | null): T | null {
	if (Array.isArray(data)) return (data[0] as T) ?? null;
	return (data as T) ?? null;
}

/** Maps a `try_match` row into the payload the queue store expects. */
export function matchPayload(row: TryMatchRow, myRole: UserRole): MatchResult {
	return {
		matchedUserId: row.counterpart_id,
		matchedName: row.counterpart_name ?? 'User',
		role: myRole === 'client' ? 'freelancer' : 'client',
		category: {
			id: row.category_id,
			name: row.category_name ?? 'General',
			icon: row.category_icon ?? '💬',
			description: row.category_description ?? ''
		},
		chatId: row.match_id
	};
}
