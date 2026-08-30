<script lang="ts">
	import { queue } from '$lib/stores/queue.svelte';

	let totalUnread = $derived(
		queue.chatMatches.reduce((sum, m) => sum + m.unreadCount, 0)
	);
</script>

<button
	class="fab"
	class:fab--open={queue.chatPanelOpen}
	onclick={() => queue.toggleChatPanel()}
	aria-label={queue.chatPanelOpen ? 'Close chat' : 'Open chat'}
>
	{#if queue.chatPanelOpen}
		<span class="fab-icon fab-icon--close">✕</span>
	{:else}
		<span class="fab-icon">💬</span>
		{#if totalUnread > 0}
			<span class="fab-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
		{/if}
	{/if}
</button>

<style>
	.fab {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 1000;
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			0 6px 24px -4px var(--gold-glow),
			0 2px 8px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.45);
		transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.fab:hover {
		transform: translateY(-3px) scale(1.05);
		box-shadow:
			0 10px 34px -6px var(--gold-glow),
			0 4px 12px rgba(0, 0, 0, 0.35),
			inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.fab:active {
		transform: translateY(0) scale(0.97);
	}

	.fab--open {
		background: linear-gradient(135deg, #1a2545, #131c36);
		border: 1px solid var(--border-strong);
		box-shadow:
			0 4px 18px rgba(0, 0, 0, 0.4),
			inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	.fab--open:hover {
		background: linear-gradient(135deg, #1e2b4f, #172040);
		border-color: rgba(255, 215, 0, 0.3);
	}

	.fab-icon {
		font-size: 1.5rem;
		line-height: 1;
		transition: transform 0.3s ease;
	}

	.fab--open .fab-icon {
		color: var(--text-2);
	}

	.fab-icon--close {
		font-size: 1.1rem;
		color: var(--text-2);
	}

	.fab:hover .fab-icon {
		transform: scale(1.1);
	}

	.fab-badge {
		position: absolute;
		top: -4px;
		right: -4px;
		min-width: 22px;
		height: 22px;
		padding: 0 6px;
		border-radius: 999px;
		background: var(--danger);
		color: #fff;
		font-size: 0.7rem;
		font-weight: 700;
		font-family: var(--font-display);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid #0d1428;
		animation: badgePop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	@keyframes badgePop {
		from { transform: scale(0); }
		to { transform: scale(1); }
	}

	@media (max-width: 600px) {
		.fab {
			bottom: 1rem;
			right: 1rem;
			width: 54px;
			height: 54px;
		}
	}
</style>
