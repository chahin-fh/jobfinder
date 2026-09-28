import { describe, expect, it } from 'vitest';
import { firstRow, matchPayload, type TryMatchRow } from './matching';

const row: TryMatchRow = {
	match_id: 'match-1',
	counterpart_id: 'user-2',
	counterpart_name: 'Dana Scully',
	category_id: 'cat-1',
	category_name: 'Web Development',
	category_icon: '🌐',
	category_description: 'Websites and web apps'
};

describe('firstRow', () => {
	it('picks the first row out of an rpc array', () => {
		expect(firstRow([row])).toBe(row);
	});

	it('returns null for an empty result set', () => {
		expect(firstRow<TryMatchRow>([])).toBeNull();
	});

	it('passes a single object straight through', () => {
		expect(firstRow(row)).toBe(row);
	});

	it('returns null for null', () => {
		expect(firstRow<TryMatchRow>(null)).toBeNull();
	});
});

describe('matchPayload', () => {
	it('assigns the counterpart the opposite role', () => {
		expect(matchPayload(row, 'client').role).toBe('freelancer');
		expect(matchPayload(row, 'freelancer').role).toBe('client');
	});

	it('maps everything the queue store needs', () => {
		const payload = matchPayload(row, 'client');

		expect(payload.matchedUserId).toBe('user-2');
		expect(payload.matchedName).toBe('Dana Scully');
		expect(payload.chatId).toBe('match-1');
		expect(payload.category).toEqual({
			id: 'cat-1',
			name: 'Web Development',
			icon: '🌐',
			description: 'Websites and web apps'
		});
	});

	it('falls back to safe defaults when the join returns nulls', () => {
		const payload = matchPayload(
			{
				...row,
				counterpart_name: null,
				category_name: null,
				category_icon: null,
				category_description: null
			},
			'client'
		);

		expect(payload.matchedName).toBe('User');
		expect(payload.category.name).toBe('General');
		expect(payload.category.icon).toBe('💬');
		expect(payload.category.description).toBe('');
	});
});
