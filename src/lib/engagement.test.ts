import { describe, expect, it } from 'vitest';
import { agreementState, nextAgreement } from './engagement';

const none = { agreed_by_client_at: null, agreed_by_freelancer_at: null };
const clientOnly = { agreed_by_client_at: '2026-01-01T00:00:00.000Z', agreed_by_freelancer_at: null };
const NOW = '2026-06-06T00:00:00.000Z';

describe('agreementState', () => {
	it('reports nothing agreed when there is no engagement', () => {
		expect(agreementState(null, 'client')).toEqual({
			clientAgreed: false,
			freelancerAgreed: false,
			iAgreed: false,
			bothAgreed: false
		});
	});

	it('reports iAgreed from the caller side only', () => {
		expect(agreementState(clientOnly, 'client').iAgreed).toBe(true);
		expect(agreementState(clientOnly, 'freelancer').iAgreed).toBe(false);
	});

	it('only sets bothAgreed when both timestamps exist', () => {
		expect(agreementState(clientOnly, 'client').bothAgreed).toBe(false);
		expect(
			agreementState(
				{ agreed_by_client_at: 'a', agreed_by_freelancer_at: 'b' },
				'client'
			).bothAgreed
		).toBe(true);
	});
});

describe('nextAgreement', () => {
	it('records a first signature without agreeing the deal', () => {
		const result = nextAgreement(none, 'client', NOW);

		expect(result.status).toBe('proposed');
		expect(result.bothAgreed).toBe(false);
		expect(result.patch.agreed_by_client_at).toBe(NOW);
		expect(result.patch.agreed_by_freelancer_at).toBeNull();
	});

	it('flips to agreed once the second side signs', () => {
		const result = nextAgreement(clientOnly, 'freelancer', NOW);

		expect(result.status).toBe('agreed');
		expect(result.bothAgreed).toBe(true);
	});

	it('is idempotent: agreeing twice keeps the original timestamp', () => {
		const both = {
			agreed_by_client_at: '2026-01-01T00:00:00.000Z',
			agreed_by_freelancer_at: '2026-01-01T00:00:00.000Z'
		};
		const result = nextAgreement(both, 'client', NOW);

		expect(result.patch.agreed_by_client_at).toBe('2026-01-01T00:00:00.000Z');
		expect(result.status).toBe('agreed');
	});
});
