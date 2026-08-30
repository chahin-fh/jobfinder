import { json, type RequestEvent } from '@sveltejs/kit';
import { requireAdmin, adminError } from '$lib/server/admin';

export async function POST(event: RequestEvent) {
	const admin = await requireAdmin(event);
	if (!admin) return adminError();

	const id = event.params.id;
	if (!id) {
		return json({ error: 'Missing category id' }, { status: 400 });
	}

	const body = await event.request.json().catch(() => ({}));
	const action = body.action;

	if (action === 'approve') {
		const { error } = await admin.supabase
			.from('categories')
			.update({ status: 'approved' })
			.eq('id', id)
			.eq('status', 'pending');

		if (error) {
			return json({ error: error.message }, { status: 500 });
		}
		return json({ success: true, status: 'approved' });
	}

	if (action === 'reject') {
		// Rejected requests are removed entirely (per product decision).
		const { error } = await admin.supabase.from('categories').delete().eq('id', id).eq('status', 'pending');

		if (error) {
			return json({ error: error.message }, { status: 500 });
		}
		return json({ success: true, status: 'rejected' });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
}
