<script lang="ts">
	import { queue } from '$lib/stores/queue.svelte';
	import ChatHistory from '$lib/components/ChatHistory.svelte';
	import ChatInterface from '$lib/components/ChatInterface.svelte';
</script>

<div class="panel">
	<div class="panel-header">
		{#if queue.chatPanelView === 'chat' && queue.matchResult}
			<button class="panel-back-btn" onclick={() => queue.backToChatHistory()}>
				<span class="back-arrow">←</span>
				Chats
			</button>
			<div class="panel-header-info">
				<div class="panel-header-avatar">
					{queue.matchResult.matchedName.charAt(0).toUpperCase()}
				</div>
				<div class="panel-header-text">
					<span class="panel-header-name">{queue.matchResult.matchedName}</span>
					<span class="panel-header-cat">{queue.matchResult.category.icon} {queue.matchResult.category.name}</span>
				</div>
			</div>
		{:else}
			<h3 class="panel-title">💬 Messages</h3>
		{/if}

		<a class="panel-close-btn" href="/app" aria-label="Back to app" title="Back to app">
			✕
		</a>
	</div>

	<div class="panel-body">
		{#if queue.chatPanelView === 'history'}
			<ChatHistory />
		{:else}
			<ChatInterface />
		{/if}
	</div>
</div>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: linear-gradient(160deg, #0b1122, #060a17);
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.85rem 1.15rem;
		border-bottom: 1px solid var(--border);
		background: rgba(19, 28, 52, 0.6);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		flex-shrink: 0;
		position: relative;
	}

	.panel-header::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.2), transparent);
	}

	.panel-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text);
		font-family: var(--font-display);
	}

	.panel-back-btn {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text-2);
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.78rem;
		font-family: inherit;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.back-arrow {
		transition: transform 0.2s ease;
	}

	.panel-back-btn:hover {
		border-color: rgba(255, 215, 0, 0.4);
		color: var(--text);
	}

	.panel-back-btn:hover .back-arrow {
		transform: translateX(-3px);
	}

	.panel-header-info {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
		flex: 1;
	}

	.panel-header-avatar {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
		font-weight: 700;
		font-family: var(--font-display);
		flex-shrink: 0;
		box-shadow: 0 0 12px -4px var(--gold-glow);
	}

	.panel-header-text {
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.panel-header-name {
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.panel-header-cat {
		font-size: 0.7rem;
		color: var(--text-3);
	}

	.panel-close-btn {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text-2);
		cursor: pointer;
		font-size: 0.8rem;
		font-family: inherit;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: all 0.2s ease;
		text-decoration: none;
	}

	.panel-close-btn:hover {
		border-color: rgba(255, 93, 115, 0.5);
		color: var(--danger);
		background: rgba(255, 93, 115, 0.06);
	}

	.panel-body {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 1.25rem;
	}
</style>
