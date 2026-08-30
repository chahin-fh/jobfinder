<script lang="ts">
	import { queue } from '$lib/stores/queue.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		queue.loadChatHistory();
	});

	function formatRelativeTime(dateStr: string) {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'confirmed': return 'var(--success)';
			case 'chatting': return 'var(--gold)';
			case 'cancelled': return 'var(--danger)';
			default: return 'var(--text-3)';
		}
	}

	function getStatusLabel(status: string) {
		switch (status) {
			case 'confirmed': return '✓ Confirmed';
			case 'chatting': return 'Active';
			case 'cancelled': return 'Cancelled';
			default: return status;
		}
	}

	function startNewMatch() {
		queue.reset();
		goto('/app');
	}
</script>

<div class="chat-history">
	{#if queue.chatHistoryLoading}
		<div class="loading-state">
			<div class="loading-spinner"></div>
			<p>Loading chats...</p>
		</div>
	{:else if queue.chatMatches.filter(m => m.status === 'confirmed').length === 0}
		<div class="empty-state">
			<div class="empty-icon">💬</div>
			<h3>No confirmed chats yet</h3>
			<p>Confirm a match to start chatting with a client or freelancer.</p>
			<button class="start-btn" onclick={startNewMatch}>
				Find a match
				<span class="arrow">→</span>
			</button>
		</div>
	{:else}
		<button class="new-match-btn" onclick={startNewMatch}>
			<span class="plus-icon">+</span>
			New Match
		</button>

			<div class="match-list">
			{#each queue.chatMatches.filter(m => m.status === 'confirmed') as match}
				<button class="match-item" onclick={() => queue.resumeChat(match.id)}>
					<div class="match-avatar">
						{match.clientName.charAt(0).toUpperCase()}
					</div>
					<div class="match-details">
						<div class="match-top-row">
							<span class="match-name">{match.clientName} & {match.freelancerName}</span>
							<span class="match-time">
								{match.lastMessageAt ? formatRelativeTime(match.lastMessageAt) : formatRelativeTime(match.createdAt)}
							</span>
						</div>
						<div class="match-bottom-row">
							<span class="match-category">
								{match.category.icon} {match.category.name}
							</span>
							<span
								class="match-status"
								style="color: {getStatusColor(match.status)}"
							>
								{getStatusLabel(match.status)}
							</span>
						</div>
						{#if match.lastMessage}
							<p class="match-preview">{match.lastMessage}</p>
						{/if}
					</div>
					<span class="match-arrow">→</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.chat-history {
		width: 100%;
		animation: fadeIn 0.3s ease;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3rem;
		color: var(--text-3);
		font-size: 0.9rem;
	}

	.loading-spinner {
		width: 28px;
		height: 28px;
		border: 3px solid var(--border);
		border-top-color: var(--gold);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem 1.5rem;
		text-align: center;
	}

	.empty-icon {
		font-size: 2.2rem;
		margin-bottom: 0.25rem;
	}

	.empty-state h3 {
		font-size: 1.1rem;
		color: var(--text);
		font-family: var(--font-display);
	}

	.empty-state p {
		color: var(--text-3);
		font-size: 0.85rem;
		max-width: 260px;
		line-height: 1.5;
	}

	.start-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		margin-top: 0.5rem;
		padding: 0.65rem 1.4rem;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		border: none;
		color: #0a0e1a;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 700;
		font-family: var(--font-display);
		transition: all 0.2s ease;
		box-shadow: var(--shadow-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.start-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 24px -4px var(--gold-glow);
	}

	.new-match-btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		width: 100%;
		background: rgba(255, 215, 0, 0.06);
		border: 1px dashed rgba(255, 215, 0, 0.3);
		color: var(--gold);
		padding: 0.7rem 1rem;
		border-radius: 0.75rem;
		cursor: pointer;
		font-size: 0.88rem;
		font-weight: 600;
		font-family: var(--font-display);
		transition: all 0.2s ease;
		margin-bottom: 0.75rem;
	}

	.new-match-btn:hover {
		background: rgba(255, 215, 0, 0.1);
		border-color: rgba(255, 215, 0, 0.5);
	}

	.plus-icon {
		font-size: 1.1rem;
		font-weight: 700;
		line-height: 1;
	}

	.match-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.match-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		background: rgba(19, 28, 52, 0.6);
		border: 1px solid var(--border);
		border-radius: 0.85rem;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		width: 100%;
		font-family: inherit;
		color: inherit;
	}

	.match-item:hover {
		border-color: rgba(255, 215, 0, 0.35);
		background: rgba(19, 28, 52, 0.85);
		transform: translateX(4px);
	}

	.match-avatar {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		font-weight: 700;
		font-family: var(--font-display);
		flex-shrink: 0;
		box-shadow: 0 0 10px -4px var(--gold-glow);
	}

	.match-details {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.match-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem;
	}

	.match-name {
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.match-time {
		font-size: 0.68rem;
		color: var(--text-3);
		flex-shrink: 0;
		white-space: nowrap;
	}

	.match-bottom-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.match-category {
		font-size: 0.73rem;
		color: var(--text-3);
	}

	.match-status {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.match-preview {
		font-size: 0.76rem;
		color: var(--text-3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-top: 0.1rem;
		line-height: 1.3;
	}

	.match-arrow {
		flex-shrink: 0;
		font-size: 0.85rem;
		color: var(--gold);
		opacity: 0;
		transform: translateX(-4px);
		transition: all 0.2s ease;
	}

	.match-item:hover .match-arrow {
		opacity: 1;
		transform: translateX(0);
	}
</style>
