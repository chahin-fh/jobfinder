import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			/** Session + verified user, or `{ session: null, user: null }`. */
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
