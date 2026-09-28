import { describe, expect, it } from 'vitest';
import { iconChoices, initials } from './utils';

describe('initials', () => {
	it('takes one letter from each of the first two words', () => {
		expect(initials('Maya Rodriguez')).toBe('MR');
	});

	it('never returns more than two initials', () => {
		expect(initials('Ada Lovelace Byron')).toBe('AL');
	});

	it('handles single-word names', () => {
		expect(initials('Prince')).toBe('P');
	});

	it('handles empty and whitespace-only names', () => {
		expect(initials('')).toBe('');
		expect(initials('   ')).toBe('');
	});

	it('collapses extra whitespace', () => {
		expect(initials('  dana   scully  ')).toBe('DS');
	});
});

describe('iconChoices', () => {
	it('offers a non-empty set of unique icons', () => {
		expect(iconChoices.length).toBeGreaterThan(0);
		expect(new Set(iconChoices).size).toBe(iconChoices.length);
	});
});
