import { createServerClient } from '@supabase/ssr';
import { type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(
		import.meta.env.VITE_SUPABASE_URL!,
		import.meta.env.VITE_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return event.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, { ...options, path: '/' });
					});
				}
			}
		}
	);

	/**
	 * Use this instead of `supabase.auth.getSession()` in server code.
	 *
	 * The raw session is read only so we can hand a real token to the client for
	 * Realtime; the identity is always verified with `getUser()` first. A forged
	 * cookie therefore yields `{ session: null, user: null }`.
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) return { session: null, user: null };

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error || !user) return { session: null, user: null };

		return { session, user };
	};

	return resolve(event);
};
