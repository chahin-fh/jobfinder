/**
 * Extract up to 2 initials from a name string.
 */
export function initials(name: string): string {
	return name
		.split(/\s+/)
		.map((part) => part[0])
		.filter(Boolean)
		.slice(0, 2)
		.join('')
		.toUpperCase();
}

/**
 * Emoji icon choices used across CategorySelector and Profile.
 */
export const iconChoices = ['💻', '📱', '🎨', '🎬', '✍️', '📊', '📈', '🎵', '🛠️', '🧠', '📷', '🗣️'] as const;
