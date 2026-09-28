import { json, type RequestEvent } from '@sveltejs/kit';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { requireUser } from '$lib/server/auth';

/**
 * Verifies the request comes from an authenticated admin user.
 * Returns the supabase client + user on success, or null when not allowed.
 */
export async function requireAdmin(
	event: RequestEvent
): Promise<{ supabase: SupabaseClient; uid: string; user: User } | null> {
	const auth = await requireUser(event);
	if (!auth) return null;

	const { data: profile } = await auth.supabase
		.from('profiles')
		.select('is_admin')
		.eq('id', auth.user.id)
		.maybeSingle();

	if (!profile?.is_admin) return null;

	return { supabase: auth.supabase, uid: auth.user.id, user: auth.user };
}

/** Helper to bail out with a 403 when requireAdmin fails. */
export function adminError() {
	return json({ error: 'Admin access required' }, { status: 403 });
}
