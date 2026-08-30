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

export type AppStep =
	| 'login'
	| 'signup'
	| 'role'
	| 'categories'
	| 'searching'
	| 'matched'
	| 'chat';

/** What's shown inside the floating chat panel */
export type ChatPanelView = 'history' | 'chat';
