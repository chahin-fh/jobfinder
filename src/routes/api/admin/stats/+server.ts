import { json, type RequestEvent } from '@sveltejs/kit';
import { requireAdmin, adminError } from '$lib/server/admin';
import { loadAdminStats } from '$lib/server/admin-stats';

export async function GET(event: RequestEvent) {
	const admin = await requireAdmin(event);
	if (!admin) return adminError();

	try {
		const stats = await loadAdminStats(admin.supabase);
		return json({ stats });
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : 'Failed to load stats' }, { status: 500 });
	}
}
