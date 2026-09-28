import type { AppNotification } from '$lib/types';
import { subscribeToInserts } from '$lib/realtime';

class NotificationsStore {
	items = $state<AppNotification[]>([]);
	loading = $state(false);
	loaded = $state(false);

	private unsubscribe: (() => void) | null = null;

	get unread() {
		return this.items.filter((n) => !n.read_at).length;
	}

	async load() {
		this.loading = true;
		try {
			const res = await fetch('/api/notifications');
			const data = await res.json().catch(() => ({}));
			if (res.ok) this.items = data.notifications ?? [];
		} catch {
			this.items = [];
		} finally {
			this.loading = false;
			this.loaded = true;
		}

		this.subscribe();
	}

	/** Realtime delivery means the badge updates without a refresh. */
	private subscribe() {
		if (this.unsubscribe) return;

		this.unsubscribe = subscribeToInserts<AppNotification>(
			'notifications',
			undefined,
			(row) => {
				if (this.items.some((n) => n.id === row.id)) return;
				this.items = [row, ...this.items];
			}
		);
	}

	async markRead(id: string) {
		this.items = this.items.map((n) =>
			n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n
		);

		try {
			await fetch('/api/notifications', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'read', id })
			});
		} catch {
			/* badge already updated locally */
		}
	}

	async markAllRead() {
		const now = new Date().toISOString();
		this.items = this.items.map((n) => ({ ...n, read_at: n.read_at ?? now }));

		try {
			await fetch('/api/notifications', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'read-all' })
			});
		} catch {
			/* badge already updated locally */
		}
	}

	stop() {
		this.unsubscribe?.();
		this.unsubscribe = null;
	}
}

export const notifications = new NotificationsStore();
