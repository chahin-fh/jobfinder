import { createClient } from '$lib/supabase';

/**
 * Subscribes to INSERT events on a table and calls `onRow` for each new row.
 *
 * Row Level Security is applied to Realtime, so a subscriber only receives rows
 * they are allowed to read (their own notifications, their own matches, messages
 * in matches they belong to, ...). Returns an unsubscribe function.
 */
export function subscribeToInserts<T>(
	table: string,
	filter: string | undefined,
	onRow: (row: T) => void
): () => void {
	const supabase = createClient();

	const channel = supabase
		.channel(`${table}:${filter ?? 'all'}:${Math.random().toString(36).slice(2)}`)
		.on(
			// @ts-expect-error - the typed overloads are narrower than the runtime API
			'postgres_changes',
			{ event: 'INSERT', schema: 'public', table, ...(filter ? { filter } : {}) },
			(payload: { new: T }) => onRow(payload.new)
		)
		.subscribe();

	return () => {
		supabase.removeChannel(channel);
	};
}
