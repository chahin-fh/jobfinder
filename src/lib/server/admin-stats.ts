import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminStats } from '$lib/types';

/**
 * Count rows matching a Supabase query (head-only, no data transferred).
 */
async function countRows(query: any): Promise<number> {
	const { count: c, error } = await query;
	if (error) throw new Error(error.message);
	return c ?? 0;
}

/**
 * Load all admin dashboard stats from the database.
 * Shared by the dashboard page server and the /api/admin/stats endpoint.
 */
export async function loadAdminStats(supabase: SupabaseClient): Promise<AdminStats> {
	const [
		totalUsers,
		clients,
		freelancers,
		totalMatches,
		confirmedMatches,
		chatMessages,
		waitingQueue,
		pendingCategories
	] = await Promise.all([
		countRows(supabase.from('profiles').select('*', { count: 'exact', head: true })),
		countRows(supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client')),
		countRows(supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'freelancer')),
		countRows(supabase.from('matches').select('*', { count: 'exact', head: true })),
		countRows(supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'confirmed')),
		countRows(supabase.from('chat_messages').select('*', { count: 'exact', head: true })),
		countRows(supabase.from('queue_entries').select('*', { count: 'exact', head: true }).eq('status', 'waiting')),
		countRows(supabase.from('categories').select('*', { count: 'exact', head: true }).eq('status', 'pending'))
	]);

	const { data: recentMatches } = await supabase
		.from('matches')
		.select(
			'id, status, created_at, client:profiles!client_id(name), freelancer:profiles!freelancer_id(name), category:categories(name)'
		)
		.order('created_at', { ascending: false })
		.limit(5);

	return {
		totalUsers,
		clients,
		freelancers,
		totalMatches,
		confirmedMatches,
		chatMessages,
		waitingQueue,
		pendingCategories,
		recentMatches: (recentMatches ?? []).map((m: any) => ({
			id: m.id,
			clientName: m.client?.name ?? 'Unknown',
			freelancerName: m.freelancer?.name ?? 'Unknown',
			category: m.category?.name ?? '—',
			status: m.status,
			createdAt: m.created_at
		}))
	};
}
