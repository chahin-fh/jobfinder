<script lang="ts">
	let { matchId, partnerName }: { matchId: string; partnerName: string } = $props();

	let rating = $state(5);
	let text = $state('');
	let busy = $state(false);
	let done = $state(false);
	let error = $state('');

	async function submit() {
		busy = true;
		error = '';

		try {
			const res = await fetch(`/api/matches/${matchId}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rating, text })
			});
			const data = await res.json().catch(() => ({}));

			if (res.status === 409) {
				done = true;
				return;
			}
			if (!res.ok) throw new Error(data.error ?? 'Could not save your review');

			done = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save your review';
		} finally {
			busy = false;
		}
	}
</script>

<div class="review">
	{#if done}
		<p class="review-done">✓ Thanks — your review of {partnerName} is published on their profile.</p>
	{:else}
		<h3 class="review-title">Rate {partnerName}</h3>
		<p class="review-sub">Reviews appear on the partner's profile. You can only review once.</p>

		{#if error}
			<p class="review-error">⚠ {error}</p>
		{/if}

		<div class="stars">
			{#each [1, 2, 3, 4, 5] as star}
				<button
					class="star"
					class:active={star <= rating}
					aria-label="{star} star{star === 1 ? '' : 's'}"
					onclick={() => (rating = star)}
				>
					★
				</button>
			{/each}
		</div>

		<textarea
			rows="3"
			maxlength="1000"
			placeholder="How was working together?"
			bind:value={text}
		></textarea>

		<button class="submit" onclick={submit} disabled={busy}>
			{busy ? 'Publishing…' : 'Publish review'}
		</button>
	{/if}
</div>

<style>
	.review {
		background: rgba(10, 15, 30, 0.6);
		border: 1px solid var(--border);
		border-radius: 0.9rem;
		padding: 1rem 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.review-title {
		font-size: 0.95rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--text);
	}

	.review-sub {
		font-size: 0.78rem;
		color: var(--text-3);
	}

	.review-done {
		color: var(--success);
		font-size: 0.85rem;
		font-weight: 600;
	}

	.review-error {
		color: #ff8fa3;
		font-size: 0.8rem;
	}

	.stars {
		display: flex;
		gap: 0.15rem;
	}

	.star {
		background: none;
		border: none;
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
		color: var(--border-strong);
		transition: transform 0.15s ease, color 0.15s ease;
		padding: 0;
	}

	.star:hover {
		transform: scale(1.15);
	}

	.star.active {
		color: var(--gold);
	}

	textarea {
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

	textarea:focus {
		border-color: var(--gold);
		box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.12);
	}

	.submit {
		align-self: flex-end;
		border: none;
		border-radius: 0.55rem;
		padding: 0.5rem 1.1rem;
		font-size: 0.82rem;
		font-weight: 700;
		font-family: var(--font-display);
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
		cursor: pointer;
		box-shadow: var(--shadow-glow);
	}

	.submit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
