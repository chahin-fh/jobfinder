<script lang="ts">
	import { queue } from '$lib/stores/queue.svelte';
</script>

<div class="queue-search">
	<div class="radar-container">
		<div class="radar-ring radar-ring-1"></div>
		<div class="radar-ring radar-ring-2"></div>
		<div class="radar-ring radar-ring-3"></div>
		<div class="radar-sweep"></div>
		<div class="radar-core"></div>
		<span class="blip blip-1"></span>
		<span class="blip blip-2"></span>
		<span class="blip blip-3"></span>
	</div>

	<div class="search-heading">
		<h2 class="searching-text">Searching</h2>
		<p class="search-sub">
			Looking for {queue.role === 'client' ? 'freelancers' : 'work'} in your selected categories…
		</p>
	</div>

	<div class="search-info">
		<div class="info-row">
			<span class="info-label">Categories</span>
			<span class="info-value">{queue.selectedCategories.map((c) => c.name).join(', ')}</span>
		</div>
		<div class="info-row">
			<span class="info-label">Elapsed</span>
			<span class="info-value">
				<span class="timer-dot"></span>
				{queue.searchTime}s
			</span>
		</div>
	</div>

	<div class="dots">
		<span class="dot" style="animation-delay: 0s"></span>
		<span class="dot" style="animation-delay: 0.15s"></span>
		<span class="dot" style="animation-delay: 0.3s"></span>
	</div>

	<button class="cancel-btn" onclick={() => queue.cancelSearch()}>
		Cancel Search
	</button>
</div>

<style>
	.queue-search {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		animation: fadeIn 0.4s ease;
	}

	.radar-container {
		position: relative;
		width: 150px;
		height: 150px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.5rem;
	}

	.radar-ring {
		position: absolute;
		border: 1px solid rgba(255, 215, 0, 0.18);
		border-radius: 50%;
	}

	.radar-ring-1 { width: 100%; height: 100%; }
	.radar-ring-2 { width: 70%; height: 70%; }
	.radar-ring-3 { width: 40%; height: 40%; }

	.radar-sweep {
		position: absolute;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: conic-gradient(from 0deg, rgba(255, 215, 0, 0.28), transparent 25%);
		animation: sweep 2.6s linear infinite;
		-webkit-mask: radial-gradient(closest-side, transparent 62%, #000 63%);
		mask: radial-gradient(closest-side, transparent 62%, #000 63%);
	}

	.radar-core {
		position: relative;
		width: 16px;
		height: 16px;
		background: radial-gradient(circle, #ffe95c, #ffb800);
		border-radius: 50%;
		box-shadow: 0 0 24px rgba(255, 215, 0, 0.7), 0 0 60px rgba(255, 215, 0, 0.3);
		animation: pulse 1.6s ease-in-out infinite;
		z-index: 2;
	}

	.blip {
		position: absolute;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #ffd700;
		box-shadow: 0 0 12px rgba(255, 215, 0, 0.9);
		animation: blipPing 2s ease-out infinite;
	}

	.blip-1 { top: 22%; left: 68%; animation-delay: 0.4s; }
	.blip-2 { top: 66%; left: 24%; animation-delay: 1.1s; }
	.blip-3 { top: 38%; left: 34%; animation-delay: 1.7s; }

	.search-heading {
		text-align: center;
	}

	.searching-text {
		font-size: 1.7rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--gold);
		margin-bottom: 0.4rem;
		text-shadow: 0 0 30px rgba(255, 215, 0, 0.25);
	}

	.search-sub {
		color: var(--text-2);
		font-size: 0.92rem;
		text-align: center;
		max-width: 320px;
		line-height: 1.5;
	}

	.search-info {
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.85), rgba(10, 15, 30, 0.9));
		border: 1px solid var(--border);
		border-radius: 0.9rem;
		padding: 1rem 1.5rem;
		width: 100%;
		max-width: 420px;
		box-shadow: var(--shadow-card);
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.35rem 0;
	}

	.info-row + .info-row {
		border-top: 1px solid var(--border);
		margin-top: 0.35rem;
		padding-top: 0.75rem;
	}

	.info-label {
		color: var(--text-3);
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.6px;
		font-weight: 600;
	}

	.info-value {
		color: var(--text);
		font-size: 0.85rem;
		font-weight: 500;
		text-align: right;
		max-width: 62%;
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.timer-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--success);
		box-shadow: 0 0 8px rgba(52, 211, 153, 0.8);
		animation: blink 1.4s ease-in-out infinite;
		flex-shrink: 0;
	}

	.dots {
		display: flex;
		gap: 0.45rem;
	}

	.dot {
		width: 6px;
		height: 6px;
		background: var(--gold);
		border-radius: 50%;
		animation: bounce 1.4s ease-in-out infinite;
	}

	.cancel-btn {
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text-2);
		padding: 0.6rem 2rem;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.88rem;
		font-family: inherit;
		transition: all 0.25s ease;
	}

	.cancel-btn:hover {
		border-color: rgba(255, 93, 115, 0.5);
		color: var(--danger);
		background: rgba(255, 93, 115, 0.06);
	}

	@keyframes sweep {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	@keyframes pulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.35); }
	}

	@keyframes blipPing {
		0% { opacity: 1; transform: scale(1); }
		70% { opacity: 0.3; transform: scale(1.4); }
		100% { opacity: 1; transform: scale(1); }
	}

	@keyframes blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	@keyframes bounce {
		0%, 80%, 100% { transform: translateY(0); }
		40% { transform: translateY(-8px); }
	}
</style>
