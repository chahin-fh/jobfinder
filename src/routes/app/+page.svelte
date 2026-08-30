<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { queue } from '$lib/stores/queue.svelte';
	import LoginForm from '$lib/components/LoginForm.svelte';
	import SignupForm from '$lib/components/SignupForm.svelte';
	import RoleSelector from '$lib/components/RoleSelector.svelte';
	import CategorySelector from '$lib/components/CategorySelector.svelte';
	import QueueSearch from '$lib/components/QueueSearch.svelte';
	import MatchFound from '$lib/components/MatchFound.svelte';
	import Profile from '$lib/components/Profile.svelte';
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

	// Load chat history once after login so the header badge is up to date
	let chatHistoryLoaded = $state(false);
	$effect(() => {
		if (queue.user && !chatHistoryLoaded) {
			chatHistoryLoaded = true;
			queue.loadChatHistory();
		}
	});

	// Show the profile view when the user is past onboarding;
	// messages open in a floating panel instead of a side column
	let showDashboard = $derived(
		queue.user && !['login', 'signup', 'role', 'categories', 'searching', 'matched'].includes(queue.step)
	);

	async function handleSignOut() {
		await queue.logout();
		await invalidateAll();
	}
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
					<a
						class="messages-header-btn"
						href="/messages"
						title="Messages"
					>
						💬
						{#if queue.chatMatches.length > 0}
							<span class="msg-badge">{queue.chatMatches.length}</span>
						{/if}
					</a>

					{#if queue.isAdmin}
						<a class="admin-header-btn" href="/dashboard" title="Admin Dashboard">🛡️</a>
					{/if}

					<a class="user-chip" href="/profile" title="View profile">
						<div class="user-avatar">{initials(queue.user.name)}</div>
						<span class="user-name">{queue.user.name}</span>
					</a>

					<button class="signout-btn" onclick={handleSignOut} title="Sign out">⏻</button>
				</div>
			{/if}
		</div>
	</header>

	{#if showDashboard}
		<!-- Profile view — messages open in a floating panel -->
		<main class="profile-main">
			<Profile />
		</main>
	{:else}
		<!-- Onboarding / auth flow -->
		<main class="main-content">
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
			{/if}
		</main>
	{/if}
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	/* ========== Header ========== */

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
		max-width: 1200px;
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
		gap: 0.6rem;
	}

	/* Messages header button */
	.messages-header-btn {
		position: relative;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: rgba(255, 215, 0, 0.08);
		border: 1px solid rgba(255, 215, 0, 0.25);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.messages-header-btn:hover {
		background: rgba(255, 215, 0, 0.16);
		border-color: rgba(255, 215, 0, 0.45);
		transform: translateY(-1px);
	}

	.msg-badge {
		position: absolute;
		top: -4px;
		right: -4px;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 999px;
		background: var(--danger);
		color: #fff;
		font-size: 0.62rem;
		font-weight: 700;
		font-family: var(--font-display);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid #0d1428;
	}

	/* Admin header button */
	.admin-header-btn {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: rgba(255, 215, 0, 0.08);
		border: 1px solid rgba(255, 215, 0, 0.25);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.05rem;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.admin-header-btn:hover {
		background: rgba(255, 215, 0, 0.16);
		border-color: rgba(255, 215, 0, 0.45);
		transform: translateY(-1px);
	}

	/* User chip — links to the profile page */
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

	/* Sign out button */
	.signout-btn {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text-2);
		cursor: pointer;
		font-size: 0.95rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}

	.signout-btn:hover {
		border-color: rgba(255, 93, 115, 0.5);
		color: var(--danger);
		background: rgba(255, 93, 115, 0.06);
	}

	/* ========== Profile view ========== */

	.profile-main {
		flex: 1;
		width: 100%;
		max-width: 820px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
	}

	/* ========== Onboarding (auth + search flow) ========== */

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

	/* ========== Responsive ========== */

	@media (max-width: 600px) {
		.user-name {
			display: none;
		}

		.header-inner {
			padding: 0.75rem 1rem;
		}
	}
</style>