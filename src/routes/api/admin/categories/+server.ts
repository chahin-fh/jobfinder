import { json, type RequestEvent } from '@sveltejs/kit';
import { requireAdmin, adminError } from '$lib/server/admin';

export async function GET(event: RequestEvent) {
	const admin = await requireAdmin(event);
	if (!admin) return adminError();

	const { data, error } = await admin.supabase
		.from('categories')
		.select('id, name, icon, description, status, created_at, creator:profiles!created_by(name)')
		.eq('status', 'pending')
		.order('created_at', { ascending: false });

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({
		categories: (data ?? []).map((c: any) => ({
			id: c.id,
			name: c.name,
			icon: c.icon,
			description: c.description,
			createdAt: c.created_at,
			requestedBy: c.creator?.name ?? 'Unknown'
		}))
	});
}
