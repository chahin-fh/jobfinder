<script lang="ts">
	import Profile from '$lib/components/Profile.svelte';
</script>

<div class="profile-page">
	<nav class="page-bar">
		<a class="back-link" href="/">
			<span class="back-arrow">←</span>
			Back to app
		</a>
		<div class="page-title">
			<span class="title-icon">👤</span>
			Profile
		</div>
	</nav>

	<Profile />
</div>

<style>
	.profile-page {
		min-height: 100vh;
		max-width: 820px;
		margin: 0 auto;
		padding: 1.25rem 1rem 4rem;
	}

	.page-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.75rem;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid var(--border);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--text-2);
		text-decoration: none;
		font-size: 0.85rem;
		font-weight: 500;
		padding: 0.45rem 0.9rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		transition: all 0.2s ease;
		background: rgba(14, 21, 41, 0.6);
	}

	.back-arrow {
		transition: transform 0.25s ease;
	}

	.back-link:hover {
		border-color: var(--border-strong);
		color: var(--text);
	}

	.back-link:hover .back-arrow {
		transform: translateX(-3px);
	}

	.page-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.05rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--text);
	}

	.title-icon {
		font-size: 1.1rem;
	}

	@media (max-width: 480px) {
		.page-title {
			font-size: 0.95rem;
		}
	}
</style>
