import type { UserRole, AuthUser, MatchResult, ChatMessage, AppStep, Category } from '$lib/types';
import { createClient } from '$lib/supabase';
import { subscribeToInserts } from '$lib/realtime';
import { categories as fallbackCategories } from '$lib/data/categories';

interface MatchRow {
	id: string;
	client_id: string;
	freelancer_id: string;
	category: Category;
	created_at: string;
	client?: { id: string; name: string };
	freelancer?: { id: string; name: string };
}

class QueueStore {
	step = $state<AppStep>('login');
	user = $state<AuthUser | null>(null);
	isAdmin = $state(false);
	role = $state<UserRole | null>(null);
	selectedCategoryIds = $state<string[]>([]);
	matchResult = $state<MatchResult | null>(null);
	messages = $state<ChatMessage[]>([]);
	searchTime = $state(0);
	categories = $state<Category[]>([]);
	loading = $state(false);
	error = $state('');

	private searchTimer: ReturnType<typeof setInterval> | null = null;
	private _pollInterval: ReturnType<typeof setInterval> | null = null;
	private realtimeUnsub: (() => void) | null = null;
	private searchStartedAt = 0;
	private supabase = createClient();

	get selectedCategories() {
		return this.categories.filter((c) => this.selectedCategoryIds.includes(c.id));
	}

	async initSession() {
		const {
			data: { session }
		} = await this.supabase.auth.getSession();
		if (session?.user) {
			this.user = {
				id: session.user.id,
				name: session.user.user_metadata?.name ?? session.user.email?.split('@')[0] ?? 'User',
				email: session.user.email!
			};
			this.step = 'role';
			return true;
		}
		return false;
	}

	async loadCategories() {
		const { data } = await this.supabase
			.from('categories')
			.select('*')
			.eq('status', 'approved')
			.order('name');
		if (data && data.length > 0) {
			this.categories = data;
		} else {
			// Fallback so the picker still works if the DB isn't seeded yet
			this.categories = fallbackCategories;
		}
	}

	async createCategory(input: { name: string; icon?: string; description?: string }) {
		const res = await fetch('/api/categories', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...input, role: this.role })
		});

		const data = await res.json();

		if (!res.ok) {
			throw new Error(data.error || 'Failed to create category');
		}

		const created = data.category as Category;
		// The category is submitted for admin approval - do NOT add it to the
		// selectable list yet; it only appears once the admin approves it.
		return created;
	}

	setRole(role: UserRole) {
		this.role = role;
		this.step = 'categories';
	}

	toggleCategory(categoryId: string) {
		if (this.selectedCategoryIds.includes(categoryId)) {
			this.selectedCategoryIds = this.selectedCategoryIds.filter((id) => id !== categoryId);
		} else {
			this.selectedCategoryIds = [...this.selectedCategoryIds, categoryId];
		}
	}

	async startSearch() {
		if (this.selectedCategoryIds.length === 0 || !this.role) return;

		this.error = '';
		this.step = 'searching';
		this.searchTime = 0;
		this.searchStartedAt = Date.now();

		this.searchTimer = setInterval(() => {
			this.searchTime += 1;
		}, 1000);

		try {
			const res = await fetch('/api/queue/join', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					role: this.role,
					category_ids: this.selectedCategoryIds
				})
			});

			const data = await res.json().catch(() => ({}));

			if (data.matched) {
				this.foundMatch(data.match);
				return;
			}

			// 409 means we were already queued by an earlier search, so keep waiting.
			// Any other failure means we never joined the queue - polling would spin
			// forever, so stop and tell the user what went wrong.
			if (!res.ok && res.status !== 409) {
				this.failSearch(data.error ?? 'Could not start the search. Please try again.');
				return;
			}

			this.beginPolling();
		} catch {
			this.failSearch('Could not reach the server. Check your connection and try again.');
		}
	}

	/** Stops every timer/subscription and returns to the category picker. */
	private failSearch(message: string) {
		this.clearTimers();
		this.error = message;
		this.step = 'categories';
	}

	private clearTimers() {
		if (this.searchTimer) {
			clearInterval(this.searchTimer);
			this.searchTimer = null;
		}
		if (this._pollInterval) {
			clearInterval(this._pollInterval);
			this._pollInterval = null;
		}
		if (this.realtimeUnsub) {
			this.realtimeUnsub();
			this.realtimeUnsub = null;
		}
	}

	/**
	 * Polls the match endpoint (authoritative, creates the match atomically) and
	 * also listens on Realtime so the other side's join is picked up instantly
	 * instead of waiting for the next tick.
	 */
	private beginPolling() {
		this._pollInterval = setInterval(() => {
			if (this.step !== 'searching') {
				this.clearTimers();
				return;
			}
			void this.pollOnce();
		}, 2000);

		this.realtimeUnsub = subscribeToInserts<MatchRow>('matches', undefined, () => {
			if (this.step === 'searching') void this.pollOnce();
		});
	}

	private async pollOnce(): Promise<void> {
		if (this.step !== 'searching') return;

		try {
			// Actively try to find a match.
			const matchRes = await fetch('/api/queue/match', { method: 'POST' });
			const matchData = await matchRes.json();

			if (matchData.matched && matchData.match) {
				this.foundMatch({
					matchedUserId: matchData.match.matchedUserId,
					matchedName: matchData.match.matchedName,
					role: matchData.match.role,
					category: matchData.match.category,
					chatId: matchData.match.chatId
				});
				return;
			}

			// Also catch a match created by the other user's own search.
			// Ignore matches that already existed when this search started,
			// otherwise any past conversation would hijack a brand new search.
			const checkRes = await fetch('/api/matches');
			const checkData = await checkRes.json();

			const fresh: MatchRow | undefined = Array.isArray(checkData.matches)
				? checkData.matches.find(
						(m: MatchRow) => new Date(m.created_at).getTime() >= this.searchStartedAt
					)
				: undefined;

			if (!fresh) return;

			const counterpart =
				fresh.client_id === this.user?.id ? fresh.freelancer : fresh.client;

			this.foundMatch({
				matchedUserId: counterpart?.id ?? '',
				matchedName: counterpart?.name ?? 'User',
				role: this.role === 'client' ? 'freelancer' : 'client',
				category: fresh.category,
				chatId: fresh.id
			});
		} catch {
			/* keep polling */
		}
	}

	private foundMatch(matchData: MatchResult) {
		this.clearTimers();
		this.matchResult = matchData;
		this.step = 'matched';
	}

	async startChat() {
		if (!this.matchResult) return;

		try {
			const res = await fetch(`/api/matches/${this.matchResult.chatId}/messages`);
			const data = await res.json();
			this.messages = (data.messages ?? []).map((m: any) => ({
				id: m.id,
				sender: m.sender_id === this.user?.id ? 'me' : 'them',
				text: m.text,
				timestamp: new Date(m.created_at)
			}));
		} catch {
			this.messages = [];
		}

		this.step = 'chatting';

		if (this.messages.length === 0) {
			const result = this.matchResult;
			if (!result) return;
			setTimeout(async () => {
				try {
					await fetch(`/api/matches/${result.chatId}/messages`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							text: `Hello! I'm interested in your project for ${result.category.name}. Let's discuss the details!`
						})
					});
				} catch {
					/* ignore */
				}
			}, 500);
		}
	}

	async sendMessage(text: string) {
		const trimmed = text.trim();
		if (!trimmed || !this.matchResult) return;

		const optimistic: ChatMessage = {
			id: `pending-${crypto.randomUUID()}`,
			sender: 'me',
			text: trimmed,
			timestamp: new Date()
		};
		this.error = '';
		this.messages = [...this.messages, optimistic];

		try {
			const res = await fetch(`/api/matches/${this.matchResult.chatId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: trimmed })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error ?? 'Message failed to send');
			if (!data.message) throw new Error('Message failed to send');

			const persisted: ChatMessage = {
				id: data.message.id,
				sender: 'me',
				text: data.message.text,
				timestamp: new Date(data.message.created_at)
			};
			this.messages = this.messages.map((message) =>
				message.id === optimistic.id ? persisted : message
			);
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Message failed to send';
			this.messages = this.messages.filter((message) => message.id !== optimistic.id);
		}
	}

	async cancelSearch() {
		this.clearTimers();
		try {
			await fetch('/api/queue/leave', { method: 'POST' });
		} catch {
			/* ignore */
		}
		this.step = 'categories';
	}

	async logout() {
		this.clearTimers();
		await this.supabase.auth.signOut();
		this.user = null;
		this.isAdmin = false;
		this.step = 'login';
		this.role = null;
		this.selectedCategoryIds = [];
		this.matchResult = null;
		this.messages = [];
		this.searchTime = 0;
		this.error = '';
	}

	goToSignup() {
		this.step = 'signup';
	}

	goToLogin() {
		this.step = 'login';
	}

	reset() {
		this.clearTimers();
		this.step = 'role';
		this.role = null;
		this.selectedCategoryIds = [];
		this.matchResult = null;
		this.messages = [];
		this.searchTime = 0;
		this.error = '';
	}
}

export const queue = new QueueStore();
