import { describe, expect, it } from 'vitest';
import { formatMoney, relativeTime } from './format';

const NOW = new Date('2026-01-01T12:00:00.000Z').getTime();

describe('relativeTime', () => {
	it('returns "New" for a missing timestamp', () => {
		expect(relativeTime(null, NOW)).toBe('New');
		expect(relativeTime(undefined, NOW)).toBe('New');
	});

	it('falls back to "New" for an unparsable timestamp', () => {
		expect(relativeTime('not-a-date', NOW)).toBe('New');
	});

	it('formats seconds as "Just now"', () => {
		expect(relativeTime('2026-01-01T11:59:30.000Z', NOW)).toBe('Just now');
	});

	it('formats minutes, hours and days', () => {
		expect(relativeTime('2026-01-01T11:55:00.000Z', NOW)).toBe('5m ago');
		expect(relativeTime('2026-01-01T09:00:00.000Z', NOW)).toBe('3h ago');
		expect(relativeTime('2025-12-30T12:00:00.000Z', NOW)).toBe('2d ago');
	});
});

describe('formatMoney', () => {
	it('drops the cents for whole amounts', () => {
		expect(formatMoney(1200, 'USD')).toBe('$1,200');
	});

	it('keeps cents for fractional amounts', () => {
		expect(formatMoney(340.5, 'USD')).toBe('$340.50');
	});

	it('degrades gracefully for an invalid currency code', () => {
		expect(formatMoney(10, 'NOPE')).toBe('10 NOPE');
	});
});
