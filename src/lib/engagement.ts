import type { UserRole } from '$lib/types';

export interface AgreementLike {
	agreed_by_client_at: string | null;
	agreed_by_freelancer_at: string | null;
}

export interface AgreementState {
	clientAgreed: boolean;
	freelancerAgreed: boolean;
	/** Has the current user already agreed? */
	iAgreed: boolean;
	bothAgreed: boolean;
}

/** Derives the agreement state of an engagement from the caller's side. */
export function agreementState(
	engagement: AgreementLike | null | undefined,
	role: UserRole
): AgreementState {
	const clientAgreed = Boolean(engagement?.agreed_by_client_at);
	const freelancerAgreed = Boolean(engagement?.agreed_by_freelancer_at);

	return {
		clientAgreed,
		freelancerAgreed,
		iAgreed: role === 'client' ? clientAgreed : freelancerAgreed,
		bothAgreed: clientAgreed && freelancerAgreed
	};
}

/**
 * Computes the column patch + resulting status when `role` agrees to terms.
 * Agreeing is idempotent: the original timestamp is kept.
 */
export function nextAgreement(
	engagement: AgreementLike | null | undefined,
	role: UserRole,
	now: string
): { patch: Record<string, string | null>; status: 'proposed' | 'agreed'; bothAgreed: boolean } {
	const current = agreementState(engagement, role);

	const patch: Record<string, string | null> = {
		agreed_by_client_at:
			role === 'client' ? (engagement?.agreed_by_client_at ?? now) : (engagement?.agreed_by_client_at ?? null),
		agreed_by_freelancer_at:
			role === 'freelancer'
				? (engagement?.agreed_by_freelancer_at ?? now)
				: (engagement?.agreed_by_freelancer_at ?? null)
	};

	const bothAgreed = Boolean(patch.agreed_by_client_at && patch.agreed_by_freelancer_at);

	return { patch, status: bothAgreed ? 'agreed' : 'proposed', bothAgreed: bothAgreed || current.bothAgreed };
}
