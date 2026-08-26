<script lang="ts">
	import { page } from '$app/stores';
	import { queue } from '$lib/stores/queue.svelte';
	import LoginForm from '$lib/components/LoginForm.svelte';
	import SignupForm from '$lib/components/SignupForm.svelte';
	import RoleSelector from '$lib/components/RoleSelector.svelte';
	import CategorySelector from '$lib/components/CategorySelector.svelte';
	import QueueSearch from '$lib/components/QueueSearch.svelte';
	import MatchFound from '$lib/components/MatchFound.svelte';
	import ChatInterface from '$lib/components/ChatInterface.svelte';
	import { initials } from '$lib/utils';

	$effect(() => {
		const session = $page.data.session;
		if (session?.user) {
			queue.isAdmin = $page.data.isAdmin === true;
			if (!queue.user) {
				queue.user = {
					id: session.user.id,
					name: session.user.user_metadata?.name ?? session.user.email?.split('@')[0] ?? 'User',
					email: session.user.email!
				};
				queue.step = 'role';
			}
		}
	});

	$effect(() => {
		if (queue.step === 'categories' && queue.categories.length === 0) {
			queue.loadCategories();
		}
	});


</script>

<div class="app">
	<header class="app-header">
		<div class="header-inner">
			<a class="logo" href="/" title="Back to home">
				<div class="logo-badge">🔍</div>
				<div class="logo-text-wrap">
					<span class="logo-text">JobFinder</span>
					<span class="logo-tag">match · connect · grow</span>
				</div>
			</a>

			{#if queue.user}
				<div class="header-right">
					{#if queue.isAdmin}
						<a class="admin-link" href="/dashboard" title="Admin dashboard">🛡️ Admin Dashboard</a>
					{/if}
					<a class="user-chip" href="/profile" title="View profile">
						<div class="user-avatar">{initials(queue.user.name)}</div>
						<span class="user-name">{queue.user.name}</span>
					</a>
					<button class="logout-btn" onclick={() => queue.logout()}>
						<span class="logout-icon">⏻</span>
						Sign Out
					</button>
				</div>
			{/if}
		</div>
	</header>

	<main class="main-content" class:full={queue.step === 'chatting'}>
		{#if queue.step === 'login'}
			<LoginForm />
		{:else if queue.step === 'signup'}
			<SignupForm />
		{:else if queue.step === 'role'}
			<RoleSelector />
		{:else if queue.step === 'categories'}
			<CategorySelector />
		{:else if queue.step === 'searching'}
			<QueueSearch />
		{:else if queue.step === 'matched'}
			<MatchFound />
		{:else if queue.step === 'chatting'}
			<ChatInterface />
		{/if}
	</main>
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.app-header {
		position: sticky;
		top: 0;
		z-index: 50;
		background: rgba(6, 10, 23, 0.72);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-bottom: 1px solid var(--border);
	}

	.app-header::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.35), transparent);
	}

	.header-inner {
		max-width: 820px;
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
		filter: saturate(1.05);
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
		color: var(--text-3);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.user-chip {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.25rem 0.9rem 0.25rem 0.3rem;
		border-radius: 999px;
		background: var(--surface);
		border: 1px solid var(--border);
		text-decoration: none;
		transition: border-color 0.2s ease, transform 0.2s ease;
	}

	.user-chip:hover {
		border-color: rgba(255, 215, 0, 0.4);
		transform: translateY(-1px);
	}

	.user-avatar {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.72rem;
		font-weight: 700;
		color: #0a0e1a;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		flex-shrink: 0;
	}

	.user-name {
		color: var(--text-2);
		font-size: 0.85rem;
		font-weight: 500;
		max-width: 140px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.admin-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: rgba(255, 215, 0, 0.08);
		border: 1px solid rgba(255, 215, 0, 0.35);
		color: var(--gold);
		padding: 0.45rem 0.95rem;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.8rem;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.admin-link:hover {
		border-color: rgba(255, 215, 0, 0.6);
		background: rgba(255, 215, 0, 0.14);
		box-shadow: var(--shadow-glow);
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

	.logout-icon {
		font-size: 0.9rem;
		transition: transform 0.3s ease;
	}

	.logout-btn:hover {
		border-color: rgba(255, 93, 115, 0.5);
		color: var(--danger);
		background: rgba(255, 93, 115, 0.06);
	}

	.logout-btn:hover .logout-icon {
		transform: rotate(90deg);
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		max-width: 820px;
		width: 100%;
		margin: 0 auto;
	}

	.main-content.full {
		max-width: none;
		padding-top: 1.5rem;
	}
</style>
