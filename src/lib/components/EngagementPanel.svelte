<script lang="ts">
	import { agreementState } from '$lib/engagement';
	import { formatMoney } from '$lib/format';
	import type { Engagement, UserRole } from '$lib/types';

	let {
		matchId,
		onStatusChange
	}: { matchId: string; onStatusChange?: (status: string) => void } = $props();

	let engagement = $state<Engagement | null>(null);
	let role = $state<UserRole>('freelancer');
	let loading = $state(true);
	let busy = $state(false);
	let error = $state('');
	let editing = $state(false);

	let scope = $state('');
	let amount = $state(0);

	const sig = $derived(agreementState(engagement, role));

	$effect(() => {
		void matchId;
		load();
	});

	async function load() {
		if (!matchId) return;
		loading = true;
		error = '';

		try {
			const res = await fetch(`/api/matches/${matchId}/engagement`);
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error ?? 'Could not load the agreement');

			engagement = data.engagement ?? null;
			role = data.role ?? 'freelancer';

			if (engagement) {
				scope = engagement.scope;
				amount = engagement.amount;
				editing = false;
			} else {
				editing = true;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load the agreement';
		} finally {
			loading = false;
		}
	}

	async function post(body: Record<string, unknown>) {
		busy = true;
		error = '';

		try {
			const res = await fetch(`/api/matches/${matchId}/engagement`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error ?? 'Could not save the agreement');

			engagement = data.engagement ?? null;
			editing = false;

			if (data.bothAgreed) onStatusChange?.('confirmed');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save the agreement';
		} finally {
			busy = false;
		}
	}

	function propose() {
		post({ action: 'propose', scope, amount });
	}
</script>

<div class="engagement">
	{#if loading}
		<div class="loading">Loading agreement…</div>
	{:else}
		<div class="eng-head">
			<h3 class="eng-title">Engagement</h3>
			{#if engagement}
				<span class="eng-status" class:agreed={sig.bothAgreed}>
					{sig.bothAgreed ? '✓ Agreed' : 'Awaiting sign-off'}
				</span>
			{/if}
		</div>

		{#if error}
			<p class="eng-error">⚠ {error}</p>
		{/if}

		{#if editing}
			<div class="eng-form">
				<label class="field">
					<span class="field-label">Scope of work</span>
					<textarea
						rows="3"
						maxlength="2000"
						placeholder="Deliverables, timeline, revisions…"
						bind:value={scope}
					></textarea>
				</label>

				<label class="field field--amount">
					<span class="field-label">Agreed amount (USD)</span>
					<input type="number" min="0" step="50" bind:value={amount} />
				</label>

				<div class="eng-actions">
					{#if engagement}
						<button class="btn-ghost" onclick={() => (editing = false)} disabled={busy}>Cancel</button>
					{/if}
					<button class="btn-primary" onclick={propose} disabled={busy || !scope.trim()}>
						{busy ? 'Saving…' : engagement ? 'Update terms' : 'Propose terms'}
					</button>
				</div>
			</div>
		{:else if engagement}
			<div class="eng-summary">
				<p class="eng-scope">{engagement.scope}</p>

				<div class="eng-meta">
					<span class="eng-amount">{formatMoney(engagement.amount, engagement.currency)}</span>
					<span class="eng-note">no payment is taken in the app yet</span>
				</div>

				<div class="eng-signs">
					<span class="sign" class:signed={sig.clientAgreed}>
						{sig.clientAgreed ? '✓' : '○'} Client
					</span>
					<span class="sign" class:signed={sig.freelancerAgreed}>
						{sig.freelancerAgreed ? '✓' : '○'} Freelancer
					</span>
				</div>

				<div class="eng-actions">
					<button class="btn-ghost" onclick={() => (editing = true)} disabled={busy}>
						Edit terms
					</button>
					<button
						class="btn-primary"
						onclick={() => post({ action: 'agree' })}
						disabled={busy || sig.iAgreed}
					>
						{sig.iAgreed ? '✓ You agreed' : busy ? 'Saving…' : 'Agree to terms'}
					</button>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.engagement {
		background: rgba(10, 15, 30, 0.6);
		border: 1px solid var(--border);
		border-radius: 0.9rem;
		padding: 1rem 1.1rem;
	}

	.loading {
		color: var(--text-3);
		font-size: 0.85rem;
	}

	.eng-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.eng-title {
		font-size: 0.95rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--text);
	}

	.eng-status {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--gold);
		background: rgba(255, 215, 0, 0.08);
		border: 1px solid rgba(255, 215, 0, 0.3);
		border-radius: 999px;
		padding: 0.2rem 0.6rem;
	}

	.eng-status.agreed {
		color: var(--success);
		background: rgba(52, 211, 153, 0.1);
		border-color: rgba(52, 211, 153, 0.35);
	}

	.eng-error {
		color: #ff8fa3;
		font-size: 0.82rem;
		margin-bottom: 0.6rem;
	}

	.eng-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.field--amount {
		max-width: 200px;
	}

	.field-label {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.7px;
		color: var(--text-3);
	}

	.field textarea,
	.field input {
		background: rgba(6, 10, 23, 0.75);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0.55rem 0.75rem;
		color: var(--text);
		font-size: 0.88rem;
		font-family: inherit;
		outline: none;
		resize: vertical;
	}

	.field textarea:focus,
	.field input:focus {
		border-color: var(--gold);
		box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.12);
	}

	.eng-summary {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.eng-scope {
		color: var(--text-2);
		font-size: 0.88rem;
		line-height: 1.6;
		white-space: pre-wrap;
	}

	.eng-meta {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.eng-amount {
		font-family: var(--font-display);
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--gold);
	}

	.eng-note {
		font-size: 0.7rem;
		color: var(--text-3);
	}

	.eng-signs {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.sign {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-3);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.2rem 0.7rem;
	}

	.sign.signed {
		color: var(--success);
		border-color: rgba(52, 211, 153, 0.35);
		background: rgba(52, 211, 153, 0.08);
	}

	.eng-actions {
		display: flex;
		gap: 0.6rem;
		justify-content: flex-end;
		margin-top: 0.25rem;
	}

	.btn-primary,
	.btn-ghost {
		border-radius: 0.55rem;
		padding: 0.5rem 1rem;
		font-size: 0.82rem;
		font-weight: 700;
		font-family: var(--font-display);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-primary {
		background: linear-gradient(135deg, #ffd700, #ffb800);
		border: none;
		color: #0a0e1a;
		box-shadow: var(--shadow-glow);
	}

	.btn-primary:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.btn-primary:disabled,
	.btn-ghost:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-ghost {
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text-2);
	}

	.btn-ghost:hover:not(:disabled) {
		border-color: rgba(255, 215, 0, 0.4);
		color: var(--text);
	}
</style>
