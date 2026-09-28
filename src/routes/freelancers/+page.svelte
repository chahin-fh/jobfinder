<script lang="ts">
	import { page } from '$app/stores';
	import NotificationBell from '$lib/components/NotificationBell.svelte';
	import { initials } from '$lib/utils';
	import { formatMoney } from '$lib/format';

	interface DirectorySkill {
		name: string;
		icon: string;
		level: number;
	}

	interface DirectoryProfile {
		id: string;
		name: string;
		title: string | null;
		bio: string | null;
		location: string | null;
		hourly_rate: number | null;
		availability: string | null;
		verified: boolean;
		jobs_done: number | null;
		success_rate: number | null;
		avatar_url: string | null;
		skills: DirectorySkill[];
	}

	let freelancers = $state<DirectoryProfile[]>([]);
	let loading = $state(true);
	let error = $state('');
	let query = $state('');
	let debounce: ReturnType<typeof setTimeout> | null = null;

	const user = $derived($page.data.session?.user);

	$effect(() => {
		load('');
	});

	async function load(q: string) {
		loading = true;
		error = '';

		try {
			const res = await fetch(
				`/api/freelancers?limit=48${q ? `&q=${encodeURIComponent(q)}` : ''}`
			);
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error ?? 'Could not load the directory');
			freelancers = data.freelancers ?? [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load the directory';
			freelancers = [];
		} finally {
			loading = false;
		}
	}

	function onSearch(value: string) {
		query = value;
		if (debounce) clearTimeout(debounce);
		debounce = setTimeout(() => load(query.trim()), 350);
	}

	const availabilityTone = (a: string | null) =>
		a === 'Available now' ? 'tone-green' : a === 'In a meeting' ? 'tone-gold' : 'tone-muted';
</script>

<svelte:head>
	<title>Freelancers | JobFinder</title>
</svelte:head>

<div class="page">
	<nav class="top-nav">
		<div class="nav-inner">
			<a class="nav-logo" href="/app" title="Back to app">
				<div class="nav-logo-badge">🔍</div>
				<span class="nav-logo-text">JobFinder</span>
			</a>

			<div class="nav-tabs">
				<a href="/freelancers" class="nav-tab active">🧑‍💻 Freelancers</a>
				<a href="/messages" class="nav-tab">💬 Messages</a>
				<a href="/app" class="nav-tab">🏠 Home</a>
				<a href="/profile" class="nav-tab">👤 Profile</a>
			</div>

			<div class="nav-user">
				<NotificationBell />
				{#if user}
					<div class="nav-avatar">{initials(user.user_metadata?.name ?? user.email ?? 'U')}</div>
				{/if}
			</div>
		</div>
	</nav>

	<main class="main">
		<header class="page-head">
			<h1 class="page-title">Browse freelancers</h1>
			<p class="page-sub">
				Every profile here is a real account. Skipping the queue is fine — start a search to get
				matched with one of them.
			</p>

			<div class="search-wrap">
				<span class="search-icon">🔍</span>
				<input
					type="search"
					placeholder="Search by name, skill area or location…"
					value={query}
					oninput={(e) => onSearch((e.currentTarget as HTMLInputElement).value)}
					aria-label="Search freelancers"
				/>
			</div>
		</header>

		{#if error}
			<div class="notice error">⚠ {error}</div>
		{/if}

		{#if loading && freelancers.length === 0}
			<div class="grid">
				{#each Array.from({ length: 6 }) as _}
					<div class="card skeleton"></div>
				{/each}
			</div>
		{:else if freelancers.length === 0}
			<div class="empty">
				<span class="empty-icon">🫥</span>
				<p>{query ? 'No freelancers match that search.' : 'No freelancer profiles yet.'}</p>
			</div>
		{:else}
			<div class="grid">
				{#each freelancers as person (person.id)}
					<article class="card">
						<div class="card-top">
							{#if person.avatar_url}
								<img class="avatar avatar-img" src={person.avatar_url} alt={person.name} />
							{:else}
								<div class="avatar">{initials(person.name)}</div>
							{/if}

							<div class="card-id">
								<h2 class="name">
									{person.name}
									{#if person.verified}<span class="verified" title="Verified">✓</span>{/if}
								</h2>
								<p class="title">{person.title ?? 'Freelancer'}</p>
							</div>
						</div>

						{#if person.bio}
							<p class="bio">{person.bio}</p>
						{/if}

						{#if person.skills.length > 0}
							<div class="skills">
								{#each person.skills as skill}
									<span class="skill">{skill.icon} {skill.name}</span>
								{/each}
							</div>
						{/if}

						<div class="meta">
							{#if person.location}<span class="meta-item">📍 {person.location}</span>{/if}
							{#if person.availability}
								<span class="meta-item tone {availabilityTone(person.availability)}">
									{person.availability}
								</span>
							{/if}
						</div>

						<div class="card-foot">
							<span class="rate">
								{person.hourly_rate && person.hourly_rate > 0
									? `${formatMoney(person.hourly_rate)}/hr`
									: 'Rate on request'}
							</span>
							<span class="jobs">
								{person.jobs_done ?? 0} job{(person.jobs_done ?? 0) === 1 ? '' : 's'} done
							</span>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</main>
</div>

<style>
	.page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.top-nav {
		position: sticky;
		top: 0;
		z-index: 50;
		background: rgba(6, 10, 23, 0.85);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-bottom: 1px solid var(--border);
	}

	.nav-inner {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
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
	}

	.nav-logo-text {
		font-family: var(--font-display);
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text);
	}

	.nav-tabs {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.nav-tab {
		padding: 0.5rem 0.9rem;
		border-radius: 999px;
		text-decoration: none;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text-3);
		transition: all 0.2s ease;
		white-space: nowrap;
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

	.nav-user {
		display: flex;
		align-items: center;
		gap: 0.6rem;
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
	}

	.main {
		flex: 1;
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding: 2.5rem 1.25rem 4rem;
	}

	.page-head {
		margin-bottom: 2rem;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 700;
		color: var(--text);
		letter-spacing: -0.02em;
		margin-bottom: 0.4rem;
	}

	.page-sub {
		color: var(--text-2);
		font-size: 0.95rem;
		max-width: 640px;
		line-height: 1.6;
		margin-bottom: 1.25rem;
	}

	.search-wrap {
		position: relative;
		max-width: 440px;
	}

	.search-icon {
		position: absolute;
		left: 0.85rem;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.85rem;
		pointer-events: none;
	}

	.search-wrap input {
		width: 100%;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.7rem 1rem 0.7rem 2.4rem;
		color: var(--text);
		font-size: 0.9rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.search-wrap input:focus {
		border-color: var(--gold);
		box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.12);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.1rem;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.9), rgba(10, 15, 30, 0.95));
		border: 1px solid var(--border);
		border-radius: 1.1rem;
		padding: 1.35rem 1.4rem;
		box-shadow: var(--shadow-card);
		transition: all 0.25s ease;
	}

	.card:hover {
		border-color: rgba(255, 215, 0, 0.35);
		transform: translateY(-3px);
	}

	.card.skeleton {
		height: 220px;
		background: linear-gradient(100deg, #0d1428 40%, #131c36 50%, #0d1428 60%);
		background-size: 200% 100%;
		animation: shimmer 1.4s infinite;
	}

	.card-top {
		display: flex;
		align-items: center;
		gap: 0.9rem;
	}

	.avatar {
		width: 54px;
		height: 54px;
		border-radius: 50%;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		font-weight: 700;
		font-family: var(--font-display);
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
	}

	.avatar-img {
		object-fit: cover;
	}

	.card-id {
		min-width: 0;
	}

	.name {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--text);
	}

	.verified {
		width: 17px;
		height: 17px;
		border-radius: 50%;
		background: linear-gradient(135deg, #34d399, #10b981);
		color: #04110c;
		font-size: 0.62rem;
		font-weight: 800;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.title {
		color: var(--text-3);
		font-size: 0.82rem;
		margin-top: 0.15rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.bio {
		color: var(--text-2);
		font-size: 0.85rem;
		line-height: 1.6;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.skills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.skill {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--text-2);
		background: rgba(255, 215, 0, 0.07);
		border: 1px solid rgba(255, 215, 0, 0.16);
		border-radius: 999px;
		padding: 0.2rem 0.6rem;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.meta-item {
		font-size: 0.75rem;
		color: var(--text-3);
	}

	.meta-item.tone-green {
		color: var(--success);
	}

	.meta-item.tone-gold {
		color: var(--gold);
	}

	.card-foot {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		border-top: 1px solid var(--border);
		padding-top: 0.8rem;
		margin-top: auto;
	}

	.rate {
		font-family: var(--font-display);
		font-size: 1rem;
		font-weight: 700;
		color: var(--gold);
	}

	.jobs {
		font-size: 0.75rem;
		color: var(--text-3);
	}

	.notice {
		border-radius: var(--radius-sm);
		padding: 0.75rem 1rem;
		font-size: 0.85rem;
		margin-bottom: 1.25rem;
	}

	.notice.error {
		background: rgba(255, 93, 115, 0.08);
		border: 1px solid rgba(255, 93, 115, 0.3);
		color: #ff8fa3;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 3rem 1rem;
		color: var(--text-3);
		text-align: center;
		border: 1px dashed var(--border-strong);
		border-radius: 1rem;
	}

	.empty-icon {
		font-size: 2rem;
	}

	@media (max-width: 860px) {
		.nav-tabs .nav-tab:not(.active) {
			display: none;
		}
	}
</style>
