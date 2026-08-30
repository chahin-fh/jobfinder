<script lang="ts">
	import { queue } from '$lib/stores/queue.svelte';
	import StepProgress from '$lib/components/StepProgress.svelte';
</script>

<div class="role-selector">
	<StepProgress active={1} />

	<h2 class="title">Who are you?</h2>
	<p class="subtitle">Choose your role to get started</p>

	<div class="role-cards">
		<button class="role-card" onclick={() => queue.setRole('client')}>
			<div class="card-glow card-glow--blue"></div>
			<div class="role-icon-ring role-icon-ring--blue">
				<div class="role-icon">💼</div>
			</div>
			<span class="role-name">Client</span>
			<span class="role-desc">I need work done. Looking for skilled freelancers.</span>
			<span class="role-cta">
				Post a job
				<span class="arrow">→</span>
			</span>
		</button>

		<button class="role-card" onclick={() => queue.setRole('freelancer')}>
			<div class="card-glow card-glow--gold"></div>
			<div class="role-icon-ring role-icon-ring--gold">
				<div class="role-icon">⚡</div>
			</div>
			<span class="role-name">Freelancer</span>
			<span class="role-desc">I offer my skills. Looking for projects to work on.</span>
			<span class="role-cta">
				Find work
				<span class="arrow">→</span>
			</span>
		</button>
	</div>
</div>

<style>
	.role-selector {
		width: 100%;
		animation: fadeIn 0.4s ease;
	}

	.title {
		font-size: 2.1rem;
		font-weight: 700;
		color: var(--text);
		text-align: center;
		margin-bottom: 0.5rem;
		letter-spacing: -0.02em;
	}

	.subtitle {
		color: var(--text-2);
		text-align: center;
		font-size: 1rem;
		margin-bottom: 2.5rem;
	}

	.role-cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		max-width: 640px;
		margin: 0 auto;
	}

	.role-card {
		position: relative;
		overflow: hidden;
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.9), rgba(10, 15, 30, 0.95));
		border: 1px solid var(--border);
		border-radius: 1.25rem;
		padding: 2.5rem 2rem 2rem;
		cursor: pointer;
		transition: all 0.3s ease;
		text-align: center;
		color: var(--text);
		font-family: inherit;
		box-shadow: var(--shadow-card);
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.card-glow {
		position: absolute;
		top: -60px;
		left: 50%;
		transform: translateX(-50%);
		width: 220px;
		height: 140px;
		border-radius: 50%;
		pointer-events: none;
		transition: opacity 0.3s ease;
		opacity: 0.55;
	}

	.card-glow--gold {
		background: radial-gradient(closest-side, rgba(255, 215, 0, 0.22), transparent);
	}

	.card-glow--blue {
		background: radial-gradient(closest-side, rgba(91, 140, 255, 0.22), transparent);
	}

	.role-card:hover {
		border-color: rgba(255, 215, 0, 0.45);
		transform: translateY(-5px);
		box-shadow: 0 20px 50px -18px rgba(0, 0, 0, 0.7), 0 0 40px -14px var(--gold-glow);
	}

	.role-card:active {
		transform: translateY(-1px) scale(0.98);
	}

	.role-card:hover .card-glow {
		opacity: 1;
	}

	.role-icon-ring {
		width: 74px;
		height: 74px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1.25rem;
		transition: transform 0.3s ease;
	}

	.role-icon-ring--gold {
		background: linear-gradient(135deg, rgba(255, 215, 0, 0.16), rgba(255, 157, 46, 0.06));
		border: 1px solid rgba(255, 215, 0, 0.35);
	}

	.role-icon-ring--blue {
		background: linear-gradient(135deg, rgba(91, 140, 255, 0.16), rgba(91, 140, 255, 0.05));
		border: 1px solid rgba(91, 140, 255, 0.35);
	}

	.role-card:hover .role-icon-ring {
		transform: scale(1.08);
	}

	.role-icon {
		font-size: 2.2rem;
	}

	.role-name {
		display: block;
		font-size: 1.45rem;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 0.6rem;
		font-family: var(--font-display);
	}

	.role-desc {
		display: block;
		color: var(--text-2);
		font-size: 0.88rem;
		line-height: 1.5;
		margin-bottom: 1.4rem;
	}

	.role-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--gold);
		letter-spacing: 0.4px;
	}

	.arrow {
		transition: transform 0.3s ease;
	}

	.role-card:hover .arrow {
		transform: translateX(4px);
	}
</style>
