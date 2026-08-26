<script lang="ts">
	/** Which step is active (1-indexed). Steps before `active` show as done. */
	let { active = 1, total = 4 }: { active?: number; total?: number } = $props();
</script>

<div class="steps">
	{#each Array.from({ length: total }) as _, i}
		{#if i > 0}<span class="step-line"></span>{/if}
		<span class="step-dot" class:active={i + 1 === active} class:done={i + 1 < active}>
			{i + 1 < active ? '✓' : i + 1}
		</span>
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
