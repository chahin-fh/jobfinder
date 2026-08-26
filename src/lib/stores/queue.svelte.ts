import type { UserRole, AuthUser, MatchResult, ChatMessage, AppStep, Category } from '$lib/types';
import { createClient } from '$lib/supabase';
import { categories as fallbackCategories } from '$lib/data/categories';

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

	private searchTimer: ReturnType<typeof setInterval> | null = null;
	private supabase = $state(createClient());

	get selectedCategories() {
		return this.categories.filter((c) => this.selectedCategoryIds.includes(c.id));
	}

	async initSession() {
		const { data: { session } } = await this.supabase.auth.getSession();
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
			body: JSON.stringify(input)
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

		this.step = 'searching';
		this.searchTime = 0;

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

			const data = await res.json();

			if (data.matched) {
				this.foundMatch(data.match);
				return;
			}

			// No immediate match - start actively polling for a match
			this.pollForMatch();

		} catch (err) {
			// On connection error, still try to poll - the user may have been added
			this.pollForMatch();
		}
	}

	private async pollForMatch() {
		// Actively try to match every 2 seconds by calling the match endpoint
		const pollInterval = setInterval(async () => {
			if (this.step !== 'searching') {
				clearInterval(pollInterval);
				return;
			}

			try {
				// Actively try to find a match
				const matchRes = await fetch('/api/queue/match', { method: 'POST' });
				const matchData = await matchRes.json();

				if (matchData.matched && matchData.match) {
					if (this.searchTimer) clearInterval(this.searchTimer);
					clearInterval(pollInterval);
					this.matchResult = {
						matchedUserId: matchData.match.matchedUserId,
						matchedName: matchData.match.matchedName,
						role: this.role === 'client' ? 'freelancer' : 'client',
						category: matchData.match.category,
						chatId: matchData.match.chatId
					};
					this.step = 'matched';
					return;
				}

				// Also check if a match was created by the other user's client
				const checkRes = await fetch('/api/matches');
				const checkData = await checkRes.json();
				if (checkData.matches && checkData.matches.length > 0) {
					const match = checkData.matches[0];
					const otherUser = match.client_id === this.user?.id
						? match.freelancer : match.client;

					if (this.searchTimer) clearInterval(this.searchTimer);
					clearInterval(pollInterval);

					this.matchResult = {
						matchedUserId: otherUser?.id ?? '',
						matchedName: otherUser?.name ?? 'User',
						role: this.role === 'client' ? 'freelancer' : 'client',
						category: match.category,
						chatId: match.id
					};
					this.step = 'matched';
				}
			} catch { /* keep polling */ }
		}, 2000);

		// Store the interval so it can be cancelled
		this._pollInterval = pollInterval;
	}

	private _pollInterval: ReturnType<typeof setInterval> | null = null;

	private foundMatch(matchData: any) {
		if (this.searchTimer) {
			clearInterval(this.searchTimer);
			this.searchTimer = null;
		}

		if (this._pollInterval) {
			clearInterval(this._pollInterval);
			this._pollInterval = null;
		}

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
				} catch { /* ignore */ }
			}, 500);
		}
	}

	async sendMessage(text: string) {
		if (!text.trim() || !this.matchResult) return;

		try {
			const res = await fetch(`/api/matches/${this.matchResult.chatId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: text.trim() })
			});
			const data = await res.json();
			if (data.message) {
				this.messages = [
					...this.messages,
					{
						id: data.message.id,
						sender: 'me',
						text: data.message.text,
						timestamp: new Date(data.message.created_at)
					}
				];
			}
		} catch {
			// Fallback to local
			this.messages = [
				...this.messages,
				{
					id: crypto.randomUUID(),
					sender: 'me',
					text: text.trim(),
					timestamp: new Date()
				}
			];
		}
	}

	async cancelSearch() {
		if (this.searchTimer) {
			clearInterval(this.searchTimer);
			this.searchTimer = null;
		}
		if (this._pollInterval) {
			clearInterval(this._pollInterval);
			this._pollInterval = null;
		}
		try {
			await fetch('/api/queue/leave', { method: 'POST' });
		} catch { /* ignore */ }
		this.step = 'categories';
	}

	async logout() {
		await this.supabase.auth.signOut();
		this.user = null;
		this.isAdmin = false;
		this.step = 'login';
		this.role = null;
		this.selectedCategoryIds = [];
		this.matchResult = null;
		this.messages = [];
		this.searchTime = 0;
	}

	goToSignup() {
		this.step = 'signup';
	}

	goToLogin() {
		this.step = 'login';
	}

	reset() {
		if (this.searchTimer) {
			clearInterval(this.searchTimer);
			this.searchTimer = null;
		}
		if (this._pollInterval) {
			clearInterval(this._pollInterval);
			this._pollInterval = null;
		}
		this.step = 'role';
		this.role = null;
		this.selectedCategoryIds = [];
		this.matchResult = null;
		this.messages = [];
		this.searchTime = 0;
	}
}

export const queue = new QueueStore();
