import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolves display names for a set of profile ids.
 *
 * The `profiles` table is RLS-protected (you can only read your own row), so
 * anything that needs another user's name goes through the `public_profiles`
 * view instead.
 */
export async function namesFor(
	supabase: SupabaseClient,
	ids: (string | null | undefined)[]
): Promise<Map<string, string>> {
	const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
	if (unique.length === 0) return new Map();

	const { data } = await supabase.from('public_profiles').select('id, name').in('id', unique);

	return new Map((data ?? []).map((p: { id: string; name: string }) => [p.id, p.name]));
}

/** Same as `namesFor`, but also returns avatar urls. */
export async function peopleFor(
	supabase: SupabaseClient,
	ids: (string | null | undefined)[]
): Promise<Map<string, { id: string; name: string; avatar_url: string | null }>> {
	const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
	if (unique.length === 0) return new Map();

	const { data } = await supabase
		.from('public_profiles')
		.select('id, name, avatar_url')
		.in('id', unique);

	return new Map((data ?? []).map((p: any) => [p.id, p]));
}
