/**
 * "Just now" / "5m ago" / "3h ago" / "2d ago" for an ISO timestamp.
 * Pure so it can be unit tested; `now` is injectable.
 */
export function relativeTime(iso: string | null | undefined, now: number = Date.now()): string {
	if (!iso) return 'New';

	const diff = now - new Date(iso).getTime();
	if (Number.isNaN(diff)) return 'New';

	const minutes = Math.floor(diff / 60_000);
	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes}m ago`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;

	return `${Math.floor(hours / 24)}d ago`;
}

/** Formats an amount + currency for display, e.g. `$1,200` / `€340.50`. */
export function formatMoney(amount: number, currency = 'USD'): string {
	try {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency,
			maximumFractionDigits: amount % 1 === 0 ? 0 : 2
		}).format(amount);
	} catch {
		return `${amount} ${currency}`;
	}
}
