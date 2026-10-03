<script lang="ts">
	/** Which step is active (1-indexed). Steps before `active` show as done. */
	let {
		active = 1,
		total = 4,
		onStepSelect
	}: { active?: number; total?: number; onStepSelect?: (step: number) => void } = $props();

	const labels = ['Role', 'Categories', 'Search', 'Match'];
</script>

<div class="steps">
	{#each Array.from({ length: total }) as _, i}
		{#if i > 0}<span class="step-line"></span>{/if}
		{#if i + 1 < active && onStepSelect}
			<button
				type="button"
				class="step-dot done"
				aria-label={`Go back to ${labels[i] ?? `step ${i + 1}`}`}
				title={`Go back to ${labels[i] ?? `step ${i + 1}`}`}
				onclick={() => onStepSelect?.(i + 1)}
			>
				✓
			</button>
		{:else}
			<span class="step-dot" class:active={i + 1 === active} class:done={i + 1 < active}>
				{i + 1 < active ? '✓' : i + 1}
			</span>
		{/if}
	{/each}
</div>

<style>
	.steps {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 2.25rem;
	}

	.step-dot {
		padding: 0;
		appearance: none;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.72rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--text-3);
		background: var(--surface);
		border: 1px solid var(--border-strong);
		transition: all 0.3s ease;
	}

	button.step-dot {
		cursor: pointer;
	}

	button.step-dot:hover {
		transform: translateY(-1px);
		box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.16);
	}

	button.step-dot:focus-visible {
		outline: 2px solid var(--gold);
		outline-offset: 3px;
	}

	.step-dot.done {
		background: linear-gradient(135deg, #ffd700, #ffb800);
		border-color: transparent;
		color: #0a0e1a;
		box-shadow: var(--shadow-glow);
	}

	.step-dot.active {
		border-color: var(--gold);
		color: var(--gold);
		box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.12);
	}

	.step-line {
		width: 44px;
		height: 1px;
		background: var(--border-strong);
		margin: 0 0.5rem;
	}
</style>
