<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { queue } from '$lib/stores/queue.svelte';

	let { data } = $props();

	let pending = $state<Array<{ id: string; name: string; icon: string; description: string; requestedBy: string; createdAt: string }>>([]);
	let busyId = $state<string | null>(null);
	let toast = $state('');

	async function loadPending() {
		const res = await fetch('/api/admin/categories');
		const json = await res.json();
		pending = json.categories ?? [];
	}

	$effect(() => {
		loadPending();
	});

	async function review(id: string, action: 'approve' | 'reject') {
		busyId = id;
		try {
			const res = await fetch(`/api/admin/categories/${id}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action })
			});
			const json = await res.json();
			if (!res.ok) {
				toast = json.error ?? 'Something went wrong';
				return;
			}
			pending = pending.filter((c) => c.id !== id);
			toast = action === 'approve' ? 'Category approved and published ✓' : 'Request rejected and removed';
			await invalidateAll();
		} finally {
			busyId = null;
		}
	}

	function formatDate(value: string) {
		if (!value) return '—';
		return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
	}

	let statCards = $derived([
		{ label: 'Total Users', value: data.stats.totalUsers, icon: '👥' },
		{ label: 'Clients', value: data.stats.clients, icon: '🧑‍💼' },
		{ label: 'Freelancers', value: data.stats.freelancers, icon: '🛠️' },
		{ label: 'Total Matches', value: data.stats.totalMatches, icon: '🤝' },
		{ label: 'Confirmed', value: data.stats.confirmedMatches, icon: '✅' },
		{ label: 'Chat Messages', value: data.stats.chatMessages, icon: '💬' },
		{ label: 'Waiting in Queue', value: data.stats.waitingQueue, icon: '⏳' },
		{ label: 'Pending Categories', value: data.stats.pendingCategories, icon: '📥' }
	]);

	const statusLabel: Record<string, string> = {
		chatting: 'Chatting',
		confirmed: 'Confirmed',
		cancelled: 'Cancelled'
	};
</script>

<div class="dashboard">
	<header class="dash-header">
		<div class="header-inner">
			<a class="logo" href="/">
				<div class="logo-badge">🛡️</div>
				<div class="logo-text-wrap">
					<span class="logo-text">JobFinder</span>
					<span class="logo-tag">admin dashboard</span>
				</div>
			</a>

			<div class="header-right">
				<a class="back-link" href="/">← Back to app</a>
				<button
					class="logout-btn"
					onclick={async () => {
						await queue.logout();
						goto('/');
					}}
				>
					⏻ Sign Out
				</button>
			</div>
		</div>
	</header>

	<main class="dash-main">
		{#if toast}
			<div class="toast">
				<span>{toast}</span>
				<button class="toast-close" onclick={() => (toast = '')}>✕</button>
			</div>
		{/if}

		<section class="section">
			<h1 class="page-title">Site Reports</h1>
			<p class="page-subtitle">A live overview of activity across JobFinder.</p>

			<div class="stats-grid">
				{#each statCards as card}
					<div class="stat-card">
						<div class="stat-icon">{card.icon}</div>
						<div class="stat-value">{card.value}</div>
						<div class="stat-label">{card.label}</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="section">
			<h2 class="section-title">
				Pending Category Requests
				{#if pending.length > 0}
					<span class="count-badge">{pending.length}</span>
				{/if}
			</h2>

			{#if pending.length === 0}
				<div class="empty-state">
					<span class="empty-icon">🎉</span>
					<p>No pending requests — all category submissions have been reviewed.</p>
				</div>
			{:else}
				<div class="request-list">
					{#each pending as req}
						<div class="request-card">
							<div class="req-icon">{req.icon}</div>
							<div class="req-body">
								<div class="req-name">{req.name}</div>
								<div class="req-desc">{req.description}</div>
								<div class="req-meta">
									Requested by <strong>{req.requestedBy}</strong> · {formatDate(req.createdAt)}
								</div>
							</div>
							<div class="req-actions">
								<button
									class="approve-btn"
									disabled={busyId === req.id}
									onclick={() => review(req.id, 'approve')}
								>
									✓ Approve
								</button>
								<button
									class="reject-btn"
									disabled={busyId === req.id}
									onclick={() => review(req.id, 'reject')}
								>
									✕ Reject
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<section class="section">
			<h2 class="section-title">Recent Matches</h2>

			{#if data.stats.recentMatches.length === 0}
				<div class="empty-state">
					<span class="empty-icon">🤝</span>
					<p>No matches yet — they will appear here once users start connecting.</p>
				</div>
			{:else}
				<div class="match-list">
					{#each data.stats.recentMatches as m}
						<div class="match-row">
							<div class="match-pair">
								<span class="match-name">{m.clientName}</span>
								<span class="match-arrow">⇄</span>
								<span class="match-name">{m.freelancerName}</span>
							</div>
							<span class="match-category">{m.category}</span>
							<span class="match-status" class:confirmed={m.status === 'confirmed'}>{statusLabel[m.status] ?? m.status}</span>
							<span class="match-date">{formatDate(m.createdAt)}</span>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</main>
</div>

<style>
	.dashboard {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.dash-header {
		position: sticky;
		top: 0;
		z-index: 50;
		background: rgba(6, 10, 23, 0.72);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-bottom: 1px solid var(--border);
	}

	.dash-header::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.35), transparent);
	}

	.header-inner {
		max-width: 1080px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.85rem 1.5rem;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
	}

	.logo-badge {
		width: 42px;
		height: 42px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		background: linear-gradient(135deg, #ffd700, #ff9d2e);
		box-shadow:
			0 4px 18px -4px var(--gold-glow),
			inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.logo-text-wrap {
		display: flex;
		flex-direction: column;
		line-height: 1.15;
	}

	.logo-text {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text);
		letter-spacing: 0.5px;
	}

	.logo-tag {
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 1.6px;
		text-transform: uppercase;
		color: var(--gold);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.back-link {
		color: var(--text-2);
		text-decoration: none;
		font-size: 0.85rem;
		padding: 0.45rem 0.9rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		transition: all 0.2s ease;
	}

	.back-link:hover {
		border-color: rgba(255, 215, 0, 0.4);
		color: var(--text);
	}

	.logout-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text-2);
		padding: 0.45rem 0.95rem;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.8rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.logout-btn:hover {
		border-color: rgba(255, 93, 115, 0.5);
		color: var(--danger);
		background: rgba(255, 93, 115, 0.06);
	}

	.dash-main {
		flex: 1;
		max-width: 1080px;
		width: 100%;
		margin: 0 auto;
		padding: 2.5rem 1.5rem 4rem;
	}

	.section {
		margin-bottom: 3rem;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 700;
		color: var(--text);
		letter-spacing: -0.02em;
		margin-bottom: 0.4rem;
	}

	.page-subtitle {
		color: var(--text-2);
		margin-bottom: 1.75rem;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 1.25rem;
	}

	.count-badge {
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
		font-size: 0.72rem;
		font-weight: 800;
		padding: 0.15rem 0.55rem;
		border-radius: 999px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.9), rgba(10, 15, 30, 0.95));
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 1.25rem 1.1rem;
		text-align: center;
		transition: all 0.25s ease;
	}

	.stat-card:hover {
		border-color: rgba(255, 215, 0, 0.35);
		transform: translateY(-2px);
	}

	.stat-icon {
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.stat-value {
		font-family: var(--font-display);
		font-size: 2rem;
		font-weight: 700;
		color: var(--gold);
		line-height: 1;
		margin-bottom: 0.35rem;
	}

	.stat-label {
		font-size: 0.78rem;
		color: var(--text-2);
		font-weight: 500;
	}

	.request-list {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.request-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.9), rgba(10, 15, 30, 0.95));
		border: 1px solid rgba(255, 215, 0, 0.22);
		border-radius: 1rem;
		padding: 1.1rem 1.25rem;
	}

	.req-icon {
		font-size: 1.7rem;
		width: 50px;
		height: 50px;
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 215, 0, 0.08);
		border: 1px solid rgba(255, 215, 0, 0.18);
		flex-shrink: 0;
	}

	.req-body {
		flex: 1;
		min-width: 0;
	}

	.req-name {
		font-weight: 600;
		color: var(--text);
		font-size: 1rem;
		margin-bottom: 0.2rem;
	}

	.req-desc {
		color: var(--text-2);
		font-size: 0.85rem;
		margin-bottom: 0.35rem;
	}

	.req-meta {
		color: var(--text-3);
		font-size: 0.75rem;
	}

	.req-meta strong {
		color: var(--text-2);
	}

	.req-actions {
		display: flex;
		gap: 0.6rem;
		flex-shrink: 0;
	}

	.approve-btn,
	.reject-btn {
		padding: 0.55rem 1.1rem;
		border-radius: 0.55rem;
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.approve-btn {
		background: linear-gradient(135deg, #ffd700, #ffb800);
		border: none;
		color: #0a0e1a;
	}

	.approve-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: var(--shadow-glow);
	}

	.reject-btn {
		background: transparent;
		border: 1px solid rgba(255, 93, 115, 0.4);
		color: var(--danger);
	}

	.reject-btn:hover:not(:disabled) {
		background: rgba(255, 93, 115, 0.08);
	}

	.approve-btn:disabled,
	.reject-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 2.5rem 1rem;
		background: rgba(10, 15, 30, 0.5);
		border: 1px dashed var(--border-strong);
		border-radius: 1rem;
		color: var(--text-3);
		font-size: 0.9rem;
		text-align: center;
	}

	.empty-icon {
		font-size: 1.8rem;
	}

	.match-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.match-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: rgba(19, 28, 52, 0.6);
		border: 1px solid var(--border);
		border-radius: 0.8rem;
		padding: 0.8rem 1.1rem;
		font-size: 0.88rem;
	}

	.match-pair {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.match-name {
		color: var(--text);
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 140px;
	}

	.match-arrow {
		color: var(--gold);
		font-size: 0.9rem;
	}

	.match-category {
		color: var(--text-2);
		font-size: 0.8rem;
		background: rgba(255, 215, 0, 0.07);
		border: 1px solid rgba(255, 215, 0, 0.15);
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		white-space: nowrap;
	}

	.match-status {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--blue);
		text-transform: capitalize;
	}

	.match-status.confirmed {
		color: var(--success);
	}

	.match-date {
		color: var(--text-3);
		font-size: 0.78rem;
		white-space: nowrap;
	}

	.toast {
		position: fixed;
		top: 5.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
		font-weight: 700;
		font-size: 0.9rem;
		padding: 0.7rem 1.2rem;
		border-radius: 999px;
		box-shadow: var(--shadow-glow);
		animation: toastIn 0.25s ease;
	}

	.toast-close {
		background: transparent;
		border: none;
		color: inherit;
		font-size: 0.85rem;
		cursor: pointer;
		padding: 0;
	}

	@keyframes toastIn {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	@media (max-width: 640px) {
		.request-card {
			flex-direction: column;
			align-items: flex-start;
		}

		.req-actions {
			width: 100%;
		}

		.approve-btn,
		.reject-btn {
			flex: 1;
		}

		.match-row {
			flex-wrap: wrap;
		}
	}
</style>
