export type UserRole = 'client' | 'freelancer';

export interface AuthUser {
	id: string;
	name: string;
	email: string;
}

export type CategoryStatus = 'approved' | 'pending' | 'rejected';

export interface Category {
	id: string;
	name: string;
	icon: string;
	description: string;
	status?: CategoryStatus;
	created_by?: string;
}

export interface RecentMatch {
	id: string;
	clientName: string;
	freelancerName: string;
	category: string;
	status: string;
	createdAt: string;
}

export interface AdminStats {
	totalUsers: number;
	clients: number;
	freelancers: number;
	totalMatches: number;
	confirmedMatches: number;
	chatMessages: number;
	waitingQueue: number;
	pendingCategories: number;
	recentMatches: RecentMatch[];
}

export interface MatchResult {
	matchedUserId: string;
	matchedName: string;
	role: UserRole;
	category: Category;
	chatId: string;
}

export interface ChatMessage {
	id: string;
	sender: 'me' | 'them';
	text: string;
	timestamp: Date;
}

export type AppStep = 'login' | 'signup' | 'role' | 'categories' | 'searching' | 'matched' | 'chatting';

export interface Conversation {
	id: string;
	participantName: string;
	participantId: string;
	participantAvatar?: string | null;
	category: string;
	categoryIcon: string;
	/** Match status: chatting | confirmed | cancelled */
	status?: string;
	lastMessage: string;
	lastMessageTime: string;
	lastMessageAt?: string | null;
	unreadCount: number;
	online: boolean;
}

export interface MessengerMessage {
	id: string;
	senderId: string;
	senderName: string;
	text: string;
	timestamp: Date;
	isMe: boolean;
}

/** The agreed scope/amount record for a match (no money movement yet). */
export interface Engagement {
	id: string;
	match_id: string;
	scope: string;
	amount: number;
	currency: string;
	status: 'proposed' | 'agreed' | 'cancelled';
	created_by: string | null;
	agreed_by_client_at: string | null;
	agreed_by_freelancer_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface AppNotification {
	id: string;
	kind: string;
	title: string;
	body: string;
	link: string;
	read_at: string | null;
	created_at: string;
}
