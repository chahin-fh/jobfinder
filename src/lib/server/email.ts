import { env } from '$env/dynamic/private';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * ==========================================================================
 *  put here api key
 *  Set RESEND_API_KEY in .env (local) and in Vercel's environment variables
 *  (production). See PUT-API-KEY-HERE.md for the full checklist.
 *  Without it, email is skipped - in-app notifications still work.
 * ==========================================================================
 */
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Sends a transactional email through Resend.
 *
 * Deliberately dependency-free (plain fetch) and a no-op when the API key is
 * missing, so local development and preview deploys keep working without email.
 * Set `RESEND_API_KEY` (and optionally `RESEND_FROM`) to enable delivery.
 */
export async function sendEmail(opts: { to: string; subject: string; text: string }) {
	const apiKey = env.RESEND_API_KEY;
	if (!apiKey) return { sent: false, skipped: true as const };

	const from = env.RESEND_FROM || 'JobFinder <onboarding@resend.dev>';

	try {
		const res = await fetch(RESEND_ENDPOINT, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ from, to: opts.to, subject: opts.subject, text: opts.text })
		});
		return { sent: res.ok, skipped: false as const };
	} catch {
		// Never let a mail failure break the user-facing request.
		return { sent: false, skipped: false as const };
	}
}

/**
 * Emails the other participant of a match. Uses the `counterpart_contact` RPC,
 * which is the only way to reach another user's address without service-role
 * access (and only for matches you belong to).
 */
export async function emailMatchPartner(
	supabase: SupabaseClient,
	matchId: string,
	opts: { subject: string; text: string }
) {
	const { data } = await supabase.rpc('counterpart_contact', { p_match_id: matchId });
	const other = Array.isArray(data) ? data[0] : data;
	if (!other?.email) return { sent: false, skipped: true as const };

	return sendEmail({ to: other.email, subject: opts.subject, text: opts.text });
}
