import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadAdminStats } from '$lib/server/admin-stats';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) redirect(302, '/');

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('is_admin')
		.eq('id', user.id)
		.maybeSingle();

	if (!profile?.is_admin) redirect(302, '/');

	const stats = await loadAdminStats(locals.supabase);

	return { stats };
};
