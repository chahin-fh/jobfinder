<script lang="ts">
	import { page } from '$app/stores';
	import { messages } from '$lib/stores/messages.svelte';
	import ConversationList from '$lib/components/ConversationList.svelte';
	import MessengerChat from '$lib/components/MessengerChat.svelte';
	import { initials } from '$lib/utils';

	const user = $derived($page.data.session?.user);

	$effect(() => {
		messages.loadConversations();
	});
</script>

<svelte:head>
	<title>Messages | JobFinder</title>
</svelte:head>

<div class="messenger-layout">
	<!-- Top Navigation Bar -->
	<nav class="top-nav">
		<div class="nav-inner">
			<a class="nav-logo" href="/app" title="Back to app">
				<div class="nav-logo-badge">🔍</div>
				<span class="nav-logo-text">JobFinder</span>
			</a>

			<div class="nav-tabs">
				<a href="/messages" class="nav-tab active">
					<span class="tab-icon">💬</span>
					Messages
				</a>
				<a href="/app" class="nav-tab">
					<span class="tab-icon">🏠</span>
					Home
				</a>
				<a href="/profile" class="nav-tab">
					<span class="tab-icon">👤</span>
					Profile
				</a>
			</div>

			<div class="nav-user">
				{#if user}
					<div class="nav-avatar">
						{initials(user.user_metadata?.name ?? user.email ?? 'U')}
					</div>
				{/if}
			</div>
		</div>
	</nav>

	<!-- Main Messenger Content -->
	<div class="messenger-content">
		<div class="messenger-container" class:has-active={messages.activeConversationId !== null}>
			<!-- Conversation List Sidebar -->
			<div class="sidebar">
				<ConversationList />
			</div>

			<!-- Chat Area -->
			<div class="chat-area">
				<MessengerChat />
			</div>
		</div>
	</div>
</div>

<style>
	.messenger-layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--bg);
	}

	/* Top Navigation */
	.top-nav {
		position: sticky;
		top: 0;
		z-index: 50;
		background: rgba(6, 10, 23, 0.85);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-bottom: 1px solid var(--border);
	}

	.top-nav::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(91, 140, 255, 0.35), transparent);
	}

	.nav-inner {
		max-width: 1400px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.65rem 1.25rem;
	}

	.nav-logo {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		text-decoration: none;
	}

	.nav-logo-badge {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
		background: linear-gradient(135deg, #ffd700, #ff9d2e);
		box-shadow: 0 4px 14px -4px var(--gold-glow);
	}

	.nav-logo-text {
		font-family: var(--font-display);
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text);
		letter-spacing: 0.3px;
	}

	.nav-tabs {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.nav-tab {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 1rem;
		border-radius: 999px;
		text-decoration: none;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text-3);
		transition: all 0.2s ease;
	}

	.nav-tab:hover {
		background: var(--surface);
		color: var(--text-2);
	}

	.nav-tab.active {
		background: rgba(91, 140, 255, 0.12);
		color: #5b8cff;
		font-weight: 600;
	}

	.tab-icon {
		font-size: 0.95rem;
	}

	.nav-user {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.nav-avatar {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.72rem;
		font-weight: 700;
		font-family: var(--font-display);
		cursor: pointer;
		transition: transform 0.2s ease;
	}

	.nav-avatar:hover {
		transform: scale(1.08);
	}

	/* Main Content */
	.messenger-content {
		flex: 1;
		display: flex;
		justify-content: center;
		padding: 0;
	}

	.messenger-container {
		width: 100%;
		max-width: 1400px;
		display: flex;
		height: calc(100vh - 58px);
		overflow: hidden;
	}

	.sidebar {
		width: 380px;
		flex-shrink: 0;
		overflow: hidden;
	}

	.chat-area {
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.nav-tabs {
			gap: 0;
		}

		.nav-tab {
			padding: 0.4rem 0.6rem;
			font-size: 0.78rem;
		}

		.nav-logo-text {
			display: none;
		}

		.messenger-container {
			flex-direction: column;
		}

		.sidebar {
			width: 100%;
			height: 100%;
			display: none;
		}

		.messenger-container.has-active .sidebar {
			display: none;
		}

		.messenger-container:not(.has-active) .sidebar {
			display: block;
		}

		.messenger-container:not(.has-active) .chat-area {
			display: none;
		}

		.messenger-container.has-active .chat-area {
			display: block;
		}
	}

	@media (min-width: 769px) and (max-width: 1024px) {
		.sidebar {
			width: 320px;
		}
	}
</style>
