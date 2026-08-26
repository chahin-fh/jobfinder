import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const session = await locals.getSession();

	let isAdmin = false;
	if (session?.user) {
		try {
			const { data } = await locals.supabase
				.from('profiles')
				.select('is_admin')
				.eq('id', session.user.id)
				.maybeSingle();
			isAdmin = data?.is_admin === true;
		} catch {
			// Column not present yet (schema not migrated) - treat as non-admin.
		}
	}

	return {
		session,
		isAdmin
	};
};
