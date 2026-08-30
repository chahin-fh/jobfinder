import { json, type RequestEvent } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Verifies the request comes from an authenticated admin user.
 * Returns the supabase client + uid on success, or null when not allowed.
 */
export async function requireAdmin(
	event: RequestEvent
): Promise<{ supabase: SupabaseClient; uid: string } | null> {
	const supabase = event.locals.supabase;

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) return null;

	const { data: profile } = await supabase
		.from('profiles')
		.select('is_admin')
		.eq('id', session.user.id)
		.maybeSingle();

	if (!profile?.is_admin) return null;

	return { supabase, uid: session.user.id };
}

/** Helper to bail out with a 401/403 when requireAdmin fails. */
export function adminError() {
	return json({ error: 'Admin access required' }, { status: 403 });
}
