import { json, type RequestEvent } from '@sveltejs/kit';
import { requireUser, unauthorized } from '$lib/server/auth';
import { loadMatchForUser, roleInMatch } from '$lib/server/matches';
import { nextAgreement } from '$lib/engagement';

/** Reads the agreement record for a match (scope, amount, who has agreed). */
export async function GET(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;

	const match = await loadMatchForUser(supabase, event.params.id, user.id);
	if (!match) return json({ error: 'Match not found' }, { status: 404 });

	const { data: engagement, error } = await supabase
		.from('engagements')
		.select('*')
		.eq('match_id', match.id)
		.maybeSingle();

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({
		engagement: engagement ?? null,
		role: roleInMatch(match, user.id),
		matchStatus: match.status
	});
}

/**
 * `{ action: 'propose', scope, amount, currency }` writes the terms.
 * `{ action: 'agree' }` records this side's sign-off; once both sides agree the
 * engagement flips to `agreed` and the match becomes `confirmed`.
 */
export async function POST(event: RequestEvent) {
	const auth = await requireUser(event);
	if (!auth) return unauthorized();
	const { supabase, user } = auth;

	const match = await loadMatchForUser(supabase, event.params.id, user.id);
	if (!match) return json({ error: 'Match not found' }, { status: 404 });

	const role = roleInMatch(match, user.id);
	const body = await event.request.json().catch(() => ({}));
	const action = body.action === 'agree' ? 'agree' : 'propose';

	const { data: existing } = await supabase
		.from('engagements')
		.select('*')
		.eq('match_id', match.id)
		.maybeSingle();

	if (action === 'propose') {
		const scope = typeof body.scope === 'string' ? body.scope.trim().slice(0, 2000) : '';
		const amount = Math.max(0, Math.min(1_000_000, Number(body.amount) || 0));
		const currency =
			typeof body.currency === 'string' && /^[A-Z]{3}$/.test(body.currency)
				? body.currency
				: 'USD';

		if (!scope) {
			return json({ error: 'Describe the scope of work first' }, { status: 400 });
		}

		const { data: engagement, error } = await supabase
			.from('engagements')
			.upsert(
				{
					match_id: match.id,
					scope,
					amount,
					currency,
					status: 'proposed',
					created_by: (existing as any)?.created_by ?? user.id,
					agreed_by_client_at: null,
					agreed_by_freelancer_at: null,
					updated_at: new Date().toISOString()
				},
				{ onConflict: 'match_id' }
			)
			.select()
			.single();

		if (error) {
			return json({ error: error.message }, { status: 500 });
		}

		return json({ engagement });
	}

	if (!existing) {
		return json({ error: 'There is no proposal to agree to yet' }, { status: 400 });
	}

	const now = new Date().toISOString();
	const { patch, status, bothAgreed } = nextAgreement(existing, role, now);

	const { data: engagement, error } = await supabase
		.from('engagements')
		.update({ ...patch, status, updated_at: now })
		.eq('match_id', match.id)
		.select()
		.single();

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	if (bothAgreed && match.status !== 'confirmed') {
		await supabase.from('matches').update({ status: 'confirmed' }).eq('id', match.id);
	}

	return json({ engagement, bothAgreed });
}
