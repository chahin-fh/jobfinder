import { json, type RequestEvent } from '@sveltejs/kit';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Resolve the signed-in user from the request cookies.
 *
 * `auth.getUser()` asks Supabase to verify the token instead of trusting the
 * cookie payload, which makes it the only safe identity check on the server.
 * `auth.getSession()` must never be used to authorise a request.
 */
export async function getUser(supabase: SupabaseClient): Promise<User | null> {
	const { data, error } = await supabase.auth.getUser();
	if (error) return null;
	return data.user ?? null;
}

/**
 * Returns the request's Supabase client and verified user, or null when the
 * caller is not signed in. Use this in every API route and server load.
 */
export async function requireUser(
	event: RequestEvent
): Promise<{ supabase: SupabaseClient; user: User } | null> {
	const supabase = event.locals.supabase;
	const user = await getUser(supabase);
	if (!user) return null;
	return { supabase, user };
}

/** Standard 401 body for API routes. */
export function unauthorized() {
	return json({ error: 'Not authenticated' }, { status: 401 });
}
