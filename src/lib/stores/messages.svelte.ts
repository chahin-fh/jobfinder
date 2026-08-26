import type { Conversation, MessengerMessage } from '$lib/types';

class MessagesStore {
	conversations = $state<Conversation[]>([]);
	activeConversationId = $state<string | null>(null);
	messages = $state<MessengerMessage[]>([]);
	loading = $state(false);
	searchQuery = $state('');

	get activeConversation() {
		return this.conversations.find((c) => c.id === this.activeConversationId) ?? null;
	}

	get filteredConversations() {
		if (!this.searchQuery.trim()) return this.conversations;
		const q = this.searchQuery.toLowerCase();
		return this.conversations.filter(
			(c) =>
				c.participantName.toLowerCase().includes(q) ||
				c.category.toLowerCase().includes(q)
		);
	}

	async loadConversations() {
		this.loading = true;
		try {
			const res = await fetch('/api/messages');
			const data = await res.json();
			if (data.conversations) {
				this.conversations = data.conversations;
			}
		} catch {
			// Fallback demo data
			this.conversations = [
				{
					id: '1',
					participantName: 'Alice Johnson',
					participantId: 'u1',
					category: 'Web Development',
					categoryIcon: '💻',
					lastMessage: 'Sure, I can start on that component tomorrow.',
					lastMessageTime: '2m ago',
					unreadCount: 2,
					online: true
				},
				{
					id: '2',
					participantName: 'Bob Smith',
					participantId: 'u2',
					category: 'UI Design',
					categoryIcon: '🎨',
					lastMessage: 'The mockups are ready for review.',
					lastMessageTime: '15m ago',
					unreadCount: 0,
					online: true
				},
				{
					id: '3',
					participantName: 'Carol Davis',
					participantId: 'u3',
					category: 'Mobile App',
					categoryIcon: '📱',
					lastMessage: 'Thanks for the update!',
					lastMessageTime: '1h ago',
					unreadCount: 0,
					online: false
				},
				{
					id: '4',
					participantName: 'David Wilson',
					participantId: 'u4',
					category: 'Backend API',
					categoryIcon: '🛠️',
					lastMessage: 'Let me check the database schema.',
					lastMessageTime: '3h ago',
					unreadCount: 0,
					online: false
				}
			];
		} finally {
			this.loading = false;
		}
	}

	async loadMessages(conversationId: string) {
		this.activeConversationId = conversationId;
		this.messages = [];

		try {
			const res = await fetch(`/api/messages/${conversationId}`);
			const data = await res.json();
			if (data.messages) {
				this.messages = data.messages.map((m: any) => ({
					id: m.id,
					senderId: m.sender_id,
					senderName: m.sender?.name ?? 'User',
					text: m.text,
					timestamp: new Date(m.created_at),
					isMe: false // Will be set by caller
				}));
			}
		} catch {
			// Fallback demo messages
			const conv = this.conversations.find((c) => c.id === conversationId);
			if (conv) {
				this.messages = [
					{
						id: 'm1',
						senderId: 'other',
						senderName: conv.participantName,
						text: `Hi! I'm ${conv.participantName}. Let's discuss the ${conv.category} project.`,
						timestamp: new Date(Date.now() - 3600000),
						isMe: false
					},
					{
						id: 'm2',
						senderId: 'me',
						senderName: 'You',
						text: "Sounds great! What's the timeline?",
						timestamp: new Date(Date.now() - 3000000),
						isMe: true
					},
					{
						id: 'm3',
						senderId: 'other',
						senderName: conv.participantName,
						text: conv.lastMessage,
						timestamp: new Date(Date.now() - 120000),
						isMe: false
					}
				];
			}
		}

		// Mark conversation as read
		const conv = this.conversations.find((c) => c.id === conversationId);
		if (conv) conv.unreadCount = 0;
	}

	async sendMessage(text: string) {
		if (!text.trim() || !this.activeConversationId) return;

		const newMsg: MessengerMessage = {
			id: crypto.randomUUID(),
			senderId: 'me',
			senderName: 'You',
			text: text.trim(),
			timestamp: new Date(),
			isMe: true
		};

		this.messages = [...this.messages, newMsg];

		// Update last message in conversation list
		const conv = this.conversations.find((c) => c.id === this.activeConversationId);
		if (conv) {
			conv.lastMessage = text.trim();
			conv.lastMessageTime = 'Just now';
			// Move to top
			this.conversations = [conv, ...this.conversations.filter((c) => c.id !== conv.id)];
		}

		try {
			await fetch(`/api/messages/${this.activeConversationId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: text.trim() })
			});
		} catch {
			// Message already added optimistically
		}
	}

	setActiveConversation(id: string) {
		this.loadMessages(id);
	}

	setSearch(query: string) {
		this.searchQuery = query;
	}

	clearActive() {
		this.activeConversationId = null;
		this.messages = [];
	}
}

export const messages = new MessagesStore();
