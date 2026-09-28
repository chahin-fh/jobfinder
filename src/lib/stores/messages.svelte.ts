import type { Conversation, MessengerMessage } from '$lib/types';
import { subscribeToInserts } from '$lib/realtime';

interface RawMessage {
	id: string;
	match_id: string;
	sender_id: string;
	text: string;
	created_at: string;
	sender_name?: string;
}

class MessagesStore {
	conversations = $state<Conversation[]>([]);
	/** Set by the page so own messages can be told apart from the other side's. */
	currentUserId = $state<string | null>(null);
	activeConversationId = $state<string | null>(null);
	messages = $state<MessengerMessage[]>([]);
	loading = $state(false);
	error = $state('');
	searchQuery = $state('');

	private unsubscribe: (() => void) | null = null;

	get activeConversation() {
		return this.conversations.find((c) => c.id === this.activeConversationId) ?? null;
	}

	get filteredConversations() {
		if (!this.searchQuery.trim()) return this.conversations;
		const q = this.searchQuery.toLowerCase();
		return this.conversations.filter(
			(c) =>
				c.participantName.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
		);
	}

	async loadConversations() {
		this.loading = true;
		this.error = '';
		try {
			const res = await fetch('/api/messages');
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error ?? 'Could not load conversations');
			this.conversations = data.conversations ?? [];
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Could not load conversations';
			this.conversations = [];
		} finally {
			this.loading = false;
		}
	}

	async loadMessages(conversationId: string) {
		this.activeConversationId = conversationId;
		this.messages = [];
		this.error = '';

		try {
			const res = await fetch(`/api/matches/${conversationId}/messages`);
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error ?? 'Could not load this conversation');

			this.messages = ((data.messages ?? []) as RawMessage[]).map((m) => this.toMessage(m));

			const conv = this.conversations.find((c) => c.id === conversationId);
			if (conv && data.status) conv.status = data.status;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Could not load this conversation';
		}

		this.markRead(conversationId);
		this.subscribe(conversationId);
	}

	/** `status` is refreshed by the engagement panel. */
	setConversationStatus(conversationId: string, status: string) {
		const conv = this.conversations.find((c) => c.id === conversationId);
		if (conv) conv.status = status;
	}

	private toMessage(m: RawMessage): MessengerMessage {
		const isMe = m.sender_id === this.currentUserId;
		return {
			id: m.id,
			senderId: m.sender_id,
			senderName:
				m.sender_name ??
				(isMe
					? 'You'
					: (this.conversations.find((c) => c.id === m.match_id)?.participantName ?? 'User')),
			text: m.text,
			timestamp: new Date(m.created_at),
			isMe
		};
	}

	private subscribe(conversationId: string) {
		this.unsubscribe?.();
		this.unsubscribe = subscribeToInserts<RawMessage>(
			'chat_messages',
			`match_id=eq.${conversationId}`,
			(row) => {
				// The optimistic copy from sendMessage may already be here.
				if (this.messages.some((m) => m.id === row.id)) return;
				this.messages = [...this.messages, this.toMessage(row)];
				if (this.activeConversationId === conversationId) this.markRead(conversationId);
			}
		);
	}

	/** Clears the unread badge and persists the read receipt. */
	async markRead(conversationId: string) {
		const conv = this.conversations.find((c) => c.id === conversationId);
		if (conv) conv.unreadCount = 0;

		try {
			await fetch(`/api/matches/${conversationId}/read`, { method: 'POST' });
		} catch {
			// Badge is already cleared locally.
		}
	}

	async sendMessage(text: string) {
		const trimmed = text.trim();
		if (!trimmed || !this.activeConversationId) return;

		const conversationId = this.activeConversationId;

		const optimistic: MessengerMessage = {
			id: `pending-${crypto.randomUUID()}`,
			senderId: this.currentUserId ?? 'me',
			senderName: 'You',
			text: trimmed,
			timestamp: new Date(),
			isMe: true
		};

		this.messages = [...this.messages, optimistic];

		const conv = this.conversations.find((c) => c.id === conversationId);
		if (conv) {
			conv.lastMessage = trimmed;
			conv.lastMessageTime = 'Just now';
			this.conversations = [conv, ...this.conversations.filter((c) => c.id !== conv.id)];
		}

		try {
			const res = await fetch(`/api/matches/${conversationId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: trimmed })
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error ?? 'Message failed to send');
			}

			const data = await res.json();
			if (data.message) {
				// Swap the optimistic row for the stored one.
				this.messages = this.messages.map((m) =>
					m.id === optimistic.id ? this.toMessage(data.message) : m
				);
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Message failed to send';
			// Mark the optimistic bubble as failed by rewriting the local id.
			this.messages = this.messages.map((m) =>
				m.id === optimistic.id ? { ...m, id: `failed-${m.id}` } : m
			);
		}
	}

	setActiveConversation(id: string) {
		this.loadMessages(id);
	}

	setSearch(query: string) {
		this.searchQuery = query;
	}

	clearActive() {
		this.unsubscribe?.();
		this.unsubscribe = null;
		this.activeConversationId = null;
		this.messages = [];
	}
}

export const messages = new MessagesStore();
