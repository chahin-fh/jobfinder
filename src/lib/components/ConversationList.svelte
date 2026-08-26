<script lang="ts">
	import { messages } from '$lib/stores/messages.svelte';
	import { initials } from '$lib/utils';

	let searchInput = $state('');

	function handleSearch() {
		messages.setSearch(searchInput);
	}

	function selectConversation(id: string) {
		messages.setActiveConversation(id);
	}
</script>

<div class="conversation-list">
	<div class="list-header">
		<h2 class="list-title">Chats</h2>
		<div class="search-wrap">
			<span class="search-icon">🔍</span>
			<input
				type="text"
				class="search-input"
				placeholder="Search conversations..."
				bind:value={searchInput}
				oninput={handleSearch}
			/>
		</div>
	</div>

	<div class="conversations">
		{#if messages.loading}
			<div class="loading-state">
				<div class="loading-spinner"></div>
				<span>Loading conversations...</span>
			</div>
		{:else if messages.filteredConversations.length === 0}
			<div class="empty-state">
				<span class="empty-icon">💬</span>
				<p class="empty-text">No conversations yet</p>
				<p class="empty-sub">Start a match to begin chatting</p>
			</div>
		{:else}
			{#each messages.filteredConversations as conv (conv.id)}
				<button
					class="conversation-item"
					class:active={messages.activeConversationId === conv.id}
					class:unread={conv.unreadCount > 0}
					onclick={() => selectConversation(conv.id)}
				>
					<div class="conv-avatar-wrap">
						<div class="conv-avatar">
							{initials(conv.participantName)}
						</div>
						{#if conv.online}
							<span class="online-dot"></span>
						{/if}
					</div>

					<div class="conv-info">
						<div class="conv-top-row">
							<span class="conv-name">{conv.participantName}</span>
							<span class="conv-time">{conv.lastMessageTime}</span>
						</div>
						<div class="conv-bottom-row">
							<span class="conv-category">{conv.categoryIcon} {conv.category}</span>
							{#if conv.unreadCount > 0}
								<span class="unread-badge">{conv.unreadCount}</span>
							{/if}
						</div>
						<p class="conv-preview">{conv.lastMessage}</p>
					</div>
				</button>
			{/each}
		{/if}
	</div>
</div>

<style>
	.conversation-list {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--bg-elevated);
		border-right: 1px solid var(--border);
	}

	.list-header {
		padding: 1.25rem 1rem 0.75rem;
		border-bottom: 1px solid var(--border);
	}

	.list-title {
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 0.75rem;
	}

	.search-wrap {
		position: relative;
		margin-bottom: 0.5rem;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.8rem;
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.55rem 0.9rem 0.55rem 2.2rem;
		color: var(--text);
		font-size: 0.85rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.search-input:focus {
		border-color: var(--gold);
		box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.12);
	}

	.search-input::placeholder {
		color: var(--text-3);
	}

	.conversations {
		flex: 1;
		overflow-y: auto;
		padding: 0.35rem 0;
	}

	.conversation-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.7rem 1rem;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		transition: background 0.15s ease;
		position: relative;
	}

	.conversation-item:hover {
		background: var(--surface);
	}

	.conversation-item.active {
		background: var(--surface-2);
	}

	.conversation-item.active::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.5rem;
		bottom: 0.5rem;
		width: 3px;
		border-radius: 0 3px 3px 0;
		background: linear-gradient(180deg, #ffd700, #ffb800);
	}

	.conv-avatar-wrap {
		position: relative;
		flex-shrink: 0;
	}

	.conv-avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: linear-gradient(135deg, #5b8cff, #4a75e0);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
		font-weight: 700;
		font-family: var(--font-display);
	}

	.conversation-item.unread .conv-avatar {
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
	}

	.online-dot {
		position: absolute;
		bottom: 1px;
		right: 1px;
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: var(--success);
		border: 2.5px solid var(--bg-elevated);
		box-shadow: 0 0 8px rgba(52, 211, 153, 0.6);
	}

	.conv-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.conv-top-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
	}

	.conv-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.conversation-item.unread .conv-name {
		color: var(--text);
		font-weight: 700;
	}

	.conv-time {
		font-size: 0.68rem;
		color: var(--text-3);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.conversation-item.unread .conv-time {
		color: var(--gold);
		font-weight: 600;
	}

	.conv-bottom-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.conv-category {
		font-size: 0.7rem;
		color: var(--text-3);
		background: rgba(91, 140, 255, 0.1);
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		white-space: nowrap;
	}

	.unread-badge {
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
		font-size: 0.65rem;
		font-weight: 700;
		min-width: 18px;
		height: 18px;
		border-radius: 999px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 0.3rem;
		flex-shrink: 0;
	}

	.conv-preview {
		font-size: 0.8rem;
		color: var(--text-3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-top: 0.1rem;
	}

	.conversation-item.unread .conv-preview {
		color: var(--text-2);
		font-weight: 500;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: var(--text-3);
		gap: 0.5rem;
	}

	.loading-spinner {
		width: 28px;
		height: 28px;
		border: 3px solid var(--border);
		border-top-color: var(--gold);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.empty-icon {
		font-size: 2.5rem;
		margin-bottom: 0.25rem;
	}

	.empty-text {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text-2);
	}

	.empty-sub {
		font-size: 0.8rem;
		color: var(--text-3);
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
