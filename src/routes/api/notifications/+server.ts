import { json, type RequestEvent } from '@sveltejs/kit';
import { requireUser, unauthorized } from '$lib/server/auth';

export async function GET(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;

	const { data, error } = await supabase
		.from('notifications')
		.select('id, kind, title, body, link, read_at, created_at')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false })
		.limit(50);

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	const notifications = data ?? [];

	return json({
		notifications,
		unread: notifications.filter((n: any) => !n.read_at).length
	});
}

/**
 * `{ action: 'read', id }` marks one notification read.
 * `{ action: 'read-all' }` clears the whole badge.
 */
export async function POST(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;

	const body = await event.request.json().catch(() => ({}));
	const now = new Date().toISOString();

	if (body.action === 'read-all') {
		const { error } = await supabase
			.from('notifications')
			.update({ read_at: now })
			.eq('user_id', user.id)
			.is('read_at', null);

		if (error) return json({ error: error.message }, { status: 500 });
		return json({ success: true });
	}

	if (body.action === 'read' && typeof body.id === 'string') {
		const { error } = await supabase
			.from('notifications')
			.update({ read_at: now })
			.eq('id', body.id)
			.eq('user_id', user.id);

		if (error) return json({ error: error.message }, { status: 500 });
		return json({ success: true });
	}

	if (body.action === 'clear') {
		const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
		if (error) return json({ error: error.message }, { status: 500 });
		return json({ success: true });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
}
