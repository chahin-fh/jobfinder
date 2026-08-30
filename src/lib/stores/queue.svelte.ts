import type { UserRole, AuthUser, MatchResult, ChatMessage, AppStep, Category, ChatPanelView } from '$lib/types';
import { createClient } from '$lib/supabase';
import { categories as fallbackCategories } from '$lib/data/categories';
import { goto } from '$app/navigation';

export interface ChatMatch {
	id: string;
	clientId: string;
	freelancerId: string;
	clientName: string;
	freelancerName: string;
	category: Category;
	status: string;
	createdAt: string;
	lastMessage?: string;
	lastMessageAt?: string;
	unreadCount: number;
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

	// Floating chat panel
	chatPanelOpen = $state(false);
	chatPanelView = $state<ChatPanelView>('history');

	// Chat history
	chatMatches = $state<ChatMatch[]>([]);
	chatHistoryLoading = $state(false);

	// Typing indicators
	otherUserTyping = $state(false);

	// Confirmation tracking
	matchStatus = $state<string>('pending');
	iConfirmed = $state(false);

	private searchTimer: ReturnType<typeof setInterval> | null = null;
	private supabase = $state(createClient());
	private realtimeChannel: any = null;
	private typingChannel: any = null;
	private typingTimeout: ReturnType<typeof setTimeout> | null = null;
	private _pollInterval: ReturnType<typeof setInterval> | null = null;

	get selectedCategories() {
		return this.categories.filter((c) => this.selectedCategoryIds.includes(c.id));
	}

	// --- Chat panel ---

	/** Navigate to the dedicated /messages page. */
	toggleChatPanel() {
		goto('/messages');
	}

	openChatPanel() {
		goto('/messages');
	}

	/** Leave the messages page and go back to the app. */
	closeChatPanel() {
		this.chatPanelOpen = false;
		goto('/app');
	}

	// --- Auth & session ---

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

		return data.category as Category;
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

			this.pollForMatch();

		} catch {
			this.pollForMatch();
		}
	}

	private async pollForMatch() {
		const pollInterval = setInterval(async () => {
			if (this.step !== 'searching') {
				clearInterval(pollInterval);
				return;
			}

			try {
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

		this._pollInterval = pollInterval;
	}

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

	// --- Chat ---

	async startChat() {
		if (!this.matchResult) return;

		// Fetch the current match status
		this.matchStatus = 'pending';
		this.iConfirmed = false;
		try {
			const matchRes = await fetch('/api/matches');
			const matchData = await matchRes.json();
			if (matchData.matches) {
				const currentMatch = matchData.matches.find((m: any) => m.id === this.matchResult?.chatId);
				if (currentMatch) {
					this.matchStatus = currentMatch.status ?? 'pending';
					this.iConfirmed = currentMatch.status === 'confirmed';
				}
			}
		} catch { /* ignore */ }

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

		// Switch the panel to the chat view and open the messages page
		this.chatPanelOpen = true;
		this.chatPanelView = 'chat';
		this.step = 'chat';
		goto('/messages');

		// Subscribe to realtime messages for this match
		this.subscribeToMessages(this.matchResult.chatId);

		// Subscribe to typing indicator channel
		this.subscribeToTyping(this.matchResult.chatId);

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

	// --- Realtime subscriptions ---

	private subscribeToMessages(matchId: string) {
		this.unsubscribeMessages();

		this.realtimeChannel = this.supabase
			.channel(`chat:${matchId}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'chat_messages',
					filter: `match_id=eq.${matchId}`
				},
				(payload) => {
					const msg = payload.new as any;
					if (msg.sender_id === this.user?.id) return;

					const newMessage: ChatMessage = {
						id: msg.id,
						sender: 'them',
						text: msg.text,
						timestamp: new Date(msg.created_at)
					};

					if (!this.messages.find((m) => m.id === newMessage.id)) {
						this.messages = [...this.messages, newMessage];
					}

					this.otherUserTyping = false;
				}
			)
			.subscribe();
	}

	private unsubscribeMessages() {
		if (this.realtimeChannel) {
			this.supabase.removeChannel(this.realtimeChannel);
			this.realtimeChannel = null;
		}
	}

	// --- Typing indicators ---

	private subscribeToTyping(matchId: string) {
		this.unsubscribeTyping();

		const otherUserId = this.matchResult?.matchedUserId;
		if (!otherUserId) return;

		this.typingChannel = this.supabase
			.channel(`typing:${matchId}`)
			.on('broadcast', { event: 'typing' }, (payload) => {
				if (payload.payload.userId === otherUserId) {
					this.otherUserTyping = true;
					if (this.typingTimeout) clearTimeout(this.typingTimeout);
					this.typingTimeout = setTimeout(() => {
						this.otherUserTyping = false;
					}, 3000);
				}
			})
			.subscribe();
	}

	private unsubscribeTyping() {
		if (this.typingChannel) {
			this.supabase.removeChannel(this.typingChannel);
			this.typingChannel = null;
		}
		if (this.typingTimeout) {
			clearTimeout(this.typingTimeout);
			this.typingTimeout = null;
		}
		this.otherUserTyping = false;
	}

	async sendTypingIndicator() {
		if (!this.typingChannel || !this.user) return;

		await this.typingChannel.send({
			type: 'broadcast',
			event: 'typing',
			payload: { userId: this.user.id }
		});
	}

	// --- Sending messages ---

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

	// --- Chat history ---

	async loadChatHistory() {
		if (!this.user) return;

		this.chatHistoryLoading = true;
		try {
			const res = await fetch('/api/matches');
			const data = await res.json();

			if (data.matches) {
				this.chatMatches = data.matches.map((m: any) => {
					const isClient = m.client_id === this.user?.id;
					const otherName = isClient
						? (m.freelancer?.name ?? 'Freelancer')
						: (m.client?.name ?? 'Client');

					return {
						id: m.id,
						clientId: m.client_id,
						freelancerId: m.freelancer_id,
						clientName: m.client?.name ?? 'Client',
						freelancerName: m.freelancer?.name ?? 'Freelancer',
						category: m.category,
						status: m.status,
						createdAt: m.created_at,
						lastMessage: m.last_message?.text,
						lastMessageAt: m.last_message?.created_at,
						unreadCount: 0
					};
				});
			}
		} catch {
			this.chatMatches = [];
		} finally {
			this.chatHistoryLoading = false;
		}
	}

	async resumeChat(matchId: string) {
		const match = this.chatMatches.find((m) => m.id === matchId);
		if (!match) return;

		const isClient = match.clientId === this.user?.id;
		const otherName = isClient ? match.freelancerName : match.clientName;

		this.matchResult = {
			matchedUserId: isClient ? match.freelancerId : match.clientId,
			matchedName: otherName,
			role: isClient ? 'freelancer' : 'client',
			category: match.category,
			chatId: match.id
		};

		// Pre-set the match status so the confirm button knows the state
		this.matchStatus = match.status ?? 'pending';
		this.iConfirmed = match.status === 'confirmed';

		await this.startChat();
	}

	/** Go back from active chat to the chat history list within the panel */
	backToChatHistory() {
		this.chatPanelView = 'history';
		// Don't unsubscribe — keep realtime alive for incoming messages
	}

	cancelSearch() {
		if (this.searchTimer) {
			clearInterval(this.searchTimer);
			this.searchTimer = null;
		}
		if (this._pollInterval) {
			clearInterval(this._pollInterval);
			this._pollInterval = null;
		}
		fetch('/api/queue/leave', { method: 'POST' }).catch(() => {});
		this.step = 'categories';
	}

	async logout() {
		this.unsubscribeMessages();
		this.unsubscribeTyping();
		await this.supabase.auth.signOut();
		this.user = null;
		this.isAdmin = false;
		this.step = 'login';
		this.role = null;
		this.selectedCategoryIds = [];
		this.matchResult = null;
		this.messages = [];
		this.searchTime = 0;
		this.chatMatches = [];
		this.otherUserTyping = false;
		this.chatPanelOpen = false;
		this.matchStatus = 'pending';
		this.iConfirmed = false;
	}

	goToSignup() {
		this.step = 'signup';
	}

	goToLogin() {
		this.step = 'login';
	}

	reset() {
		this.unsubscribeMessages();
		this.unsubscribeTyping();
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
