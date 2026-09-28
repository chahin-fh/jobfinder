<script lang="ts">
	import { goto } from '$app/navigation';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { relativeTime } from '$lib/format';
	import type { AppNotification } from '$lib/types';

	let open = $state(false);
	let root: HTMLDivElement | null = $state(null);

	$effect(() => {
		notifications.load();
		return () => notifications.stop();
	});

	$effect(() => {
		if (!open) return;

		function onPointerDown(event: MouseEvent) {
			if (root && !root.contains(event.target as Node)) open = false;
		}

		document.addEventListener('mousedown', onPointerDown);
		return () => document.removeEventListener('mousedown', onPointerDown);
	});

	async function openItem(item: AppNotification) {
		if (!item.read_at) notifications.markRead(item.id);
		open = false;
		if (item.link) await goto(item.link);
	}
</script>

<div class="bell-wrap" bind:this={root}>
	<button
		class="bell-btn"
		aria-label="Notifications"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		🔔
		{#if notifications.unread > 0}
			<span class="badge">{notifications.unread > 9 ? '9+' : notifications.unread}</span>
		{/if}
	</button>

	{#if open}
		<div class="panel">
			<div class="panel-head">
				<span class="panel-title">Notifications</span>
				{#if notifications.unread > 0}
					<button class="mark-all" onclick={() => notifications.markAllRead()}>Mark all read</button>
				{/if}
			</div>

			{#if notifications.loading && notifications.items.length === 0}
				<div class="empty">Loading…</div>
			{:else if notifications.items.length === 0}
				<div class="empty">You're all caught up.</div>
			{:else}
				<div class="list">
					{#each notifications.items as item (item.id)}
						<button class="item" class:unread={!item.read_at} onclick={() => openItem(item)}>
							<span class="item-icon">
								{item.kind === 'message' ? '💬' : item.kind === 'match' ? '🤝' : item.kind === 'engagement' ? '✅' : '🔔'}
							</span>
							<span class="item-body">
								<span class="item-title">{item.title}</span>
								{#if item.body}<span class="item-text">{item.body}</span>{/if}
								<span class="item-time">{relativeTime(item.created_at)}</span>
							</span>
							{#if !item.read_at}<span class="dot"></span>{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.bell-wrap {
		position: relative;
	}

	.bell-btn {
		position: relative;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		background: var(--surface);
		border: 1px solid var(--border);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.bell-btn:hover {
		border-color: rgba(255, 215, 0, 0.5);
		background: rgba(255, 215, 0, 0.08);
	}

	.badge {
		position: absolute;
		top: -4px;
		right: -4px;
		min-width: 18px;
		height: 18px;
		padding: 0 0.25rem;
		border-radius: 999px;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
		font-size: 0.62rem;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--bg);
	}

	.panel {
		position: absolute;
		top: calc(100% + 0.6rem);
		right: 0;
		width: 340px;
		max-width: min(340px, calc(100vw - 2rem));
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.98), rgba(10, 15, 30, 0.99));
		border: 1px solid var(--border-strong);
		border-radius: 1rem;
		box-shadow: 0 24px 60px -18px rgba(0, 0, 0, 0.8);
		overflow: hidden;
		z-index: 200;
		animation: panelIn 0.18s ease;
	}

	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	.panel-title {
		font-size: 0.85rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--text);
	}

	.mark-all {
		background: none;
		border: none;
		color: var(--gold);
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
		padding: 0;
	}

	.mark-all:hover {
		text-decoration: underline;
	}

	.list {
		max-height: 380px;
		overflow-y: auto;
	}

	.item {
		display: flex;
		align-items: flex-start;
		gap: 0.7rem;
		width: 100%;
		padding: 0.8rem 1rem;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--border);
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		transition: background 0.15s ease;
	}

	.item:hover {
		background: var(--surface);
	}

	.item.unread {
		background: rgba(255, 215, 0, 0.045);
	}

	.item-icon {
		font-size: 1rem;
		line-height: 1.4;
		flex-shrink: 0;
	}

	.item-body {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
		flex: 1;
	}

	.item-title {
		font-size: 0.84rem;
		font-weight: 600;
		color: var(--text);
	}

	.item-text {
		font-size: 0.78rem;
		color: var(--text-2);
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.item-time {
		font-size: 0.68rem;
		color: var(--text-3);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--gold);
		flex-shrink: 0;
		margin-top: 0.35rem;
	}

	.empty {
		padding: 2rem 1rem;
		text-align: center;
		color: var(--text-3);
		font-size: 0.85rem;
	}

	@keyframes panelIn {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 480px) {
		.panel {
			right: auto;
			left: 50%;
			transform: translateX(-50%);
		}
	}
</style>
