<script lang="ts">
	import { queue } from '$lib/stores/queue.svelte';
</script>

<div class="match-found">
	<div class="celebration">
		<div class="confetti">
			{#each Array.from({ length: 14 }) as _, i}
				<span class="confetti-piece" style="--i: {i}"></span>
			{/each}
		</div>
		<div class="burst"></div>
		<div class="avatar-ring">
			<div class="match-avatar">
				{queue.matchResult?.matchedName.charAt(0).toUpperCase()}
			</div>
		</div>
	</div>

	<div class="match-heading">
		<h2 class="match-title">Match Found!</h2>
		<p class="match-sub">You've been connected with a {queue.matchResult?.role}</p>
	</div>

	<div class="match-card">
		<div class="match-info">
			<h3 class="match-name">{queue.matchResult?.matchedName}</h3>
			<span class="match-role">
				{queue.matchResult?.role === 'client' ? '💼 Client' : '⚡ Freelancer'}
			</span>
		</div>
		<div class="match-divider"></div>
		<div class="match-category">
			<span class="category-chip">
				<span class="category-chip-icon">{queue.matchResult?.category.icon}</span>
				{queue.matchResult?.category.name}
			</span>
		</div>
	</div>

	<button class="chat-btn" onclick={() => queue.startChat()}>
		Start Chat
		<span class="chat-arrow">💬</span>
	</button>
</div>

<style>
	.match-found {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.75rem;
		animation: popIn 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		width: 100%;
	}

	.celebration {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 150px;
		height: 150px;
	}

	.avatar-ring {
		position: relative;
		width: 110px;
		height: 110px;
		border-radius: 50%;
		padding: 3px;
		background: conic-gradient(from 210deg, #ffd700, #ff9d2e, #ff5d73, #5b8cff, #ffd700);
		animation: ringSpin 8s linear infinite;
		box-shadow: 0 0 50px -8px var(--gold-glow);
		z-index: 2;
	}

	.match-avatar {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: linear-gradient(160deg, #131c36, #0a0f1e);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2.6rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--gold);
		border: 3px solid rgba(6, 10, 23, 0.9);
		animation: ringSpin 8s linear infinite reverse;
	}

	.burst {
		position: absolute;
		width: 120px;
		height: 120px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%);
		animation: burstPulse 1.6s ease-out infinite;
		z-index: 1;
	}

	.confetti {
		position: absolute;
		inset: 0;
		z-index: 3;
		pointer-events: none;
	}

	.confetti-piece {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 7px;
		height: 7px;
		border-radius: 2px;
		background: hsl(calc(var(--i) * 25deg), 90%, 62%);
		animation: confettiFall 2.4s ease-in infinite;
		animation-delay: calc(var(--i) * 0.16s);
		opacity: 0;
	}

	.match-heading {
		text-align: center;
	}

	.match-title {
		font-size: 2.4rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--gold);
		margin-bottom: 0.35rem;
		letter-spacing: -0.02em;
		text-shadow: 0 0 40px rgba(255, 215, 0, 0.3);
	}

	.match-sub {
		color: var(--text-2);
		font-size: 0.98rem;
	}

	.match-card {
		display: flex;
		align-items: center;
		gap: 1.4rem;
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.92), rgba(10, 15, 30, 0.96));
		border: 1px solid var(--border);
		border-radius: 1.1rem;
		padding: 1.3rem 1.9rem;
		min-width: 340px;
		box-shadow: var(--shadow-card);
	}

	.match-info {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.match-name {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--text);
		font-family: var(--font-display);
	}

	.match-role {
		font-size: 0.85rem;
		color: var(--text-2);
	}

	.match-divider {
		width: 1px;
		align-self: stretch;
		background: var(--border);
	}

	.match-category {
		display: flex;
		align-items: center;
	}

	.category-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(255, 215, 0, 0.08);
		border: 1px solid rgba(255, 215, 0, 0.3);
		border-radius: 999px;
		padding: 0.45rem 0.9rem;
		font-size: 0.82rem;
		font-weight: 500;
		color: var(--text);
	}

	.category-chip-icon {
		font-size: 1rem;
	}

	.chat-btn {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.95rem 2.6rem;
		font-size: 1.05rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: #0a0e1a;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		border: none;
		border-radius: 0.65rem;
		cursor: pointer;
		transition: all 0.25s ease;
		letter-spacing: 0.5px;
		box-shadow: var(--shadow-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.chat-arrow {
		font-size: 1.05rem;
		transition: transform 0.25s ease;
	}

	.chat-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 34px -6px var(--gold-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.chat-btn:hover .chat-arrow {
		transform: scale(1.25) rotate(10deg);
	}

	.chat-btn:active {
		transform: translateY(0) scale(0.99);
	}

	@keyframes popIn {
		from { opacity: 0; transform: scale(0.85); }
		to { opacity: 1; transform: scale(1); }
	}

	@keyframes ringSpin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	@keyframes burstPulse {
		0% { transform: scale(0.8); opacity: 0.6; }
		100% { transform: scale(1.6); opacity: 0; }
	}

	@keyframes confettiFall {
		0% {
			opacity: 1;
			transform: translate(0, 0) rotate(0deg);
		}
		100% {
			opacity: 0;
			transform: translate(
				calc((var(--i) - 6.5) * 24px),
				calc(78px + (var(--i) * 4px))
			) rotate(calc(var(--i) * 50deg));
		}
	}
</style>
