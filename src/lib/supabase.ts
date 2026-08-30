import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase browser client.
 *
 * `@supabase/ssr` persists the session in cookies, which keeps the user
 * signed in across page reloads and makes the session visible to the
 * SvelteKit server (`src/hooks.server.ts`) and the `/api/*` routes.
 *
 * The `rememberMe` flag records the user's "remember me" choice in
 * `localStorage` so the preference survives page reloads.
 */
export function createClient(rememberMe = false) {
	// Record the "remember me" preference.
	// Guard against SSR — localStorage is only available in the browser.
	if (rememberMe && typeof window !== 'undefined') {
		localStorage.setItem('remember_me', 'true');
	}

	return createBrowserClient(
		import.meta.env.VITE_SUPABASE_URL!,
		import.meta.env.VITE_SUPABASE_ANON_KEY!,
		{
			auth: {
				/*
				 * autoRefreshToken keeps the session alive in the background
				 * by refreshing the token while the tab is open. Session
				 * persistence itself is handled by @supabase/ssr via cookies.
				 */
				autoRefreshToken: true
			}
		}
	);
}
