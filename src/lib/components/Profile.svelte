<script lang="ts">
	import { page } from '$app/stores';
	import { initials, iconChoices } from '$lib/utils';

	// ============================================================
	// PROFILE — backed by Supabase via /api/profile.
	// First visit auto-seeds a default profile (editable below).
	// The DEFAULT_PROFILE below is the seed content for new users.
	// ============================================================

	const roleOptions: { value: 'freelancer' | 'client'; label: string; icon: string }[] = [
		{ value: 'freelancer', label: 'Freelancer', icon: '⚡' },
		{ value: 'client', label: 'Client', icon: '💼' }
	];

	const availabilityOptions = ['Available now', 'In a meeting', 'Away'];

	const gradientChoices = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'];

	interface Skill {
		name: string;
		icon: string;
		level: number;
	}

	interface Project {
		title: string;
		category: string;
		icon: string;
		year: number;
		blurb: string;
		gradient: string;
	}

	interface Review {
		reviewerName: string;
		reviewerRole: string;
		rating: number;
		date: string;
		text: string;
	}

	interface ProfileData {
		name: string;
		title: string;
		role: 'freelancer' | 'client';
		verified: boolean;
		availability: string;
		location: string;
		hourlyRate: number;
		bio: string;
		stats: { jobs: number; successRate: number; responseTime: string; rating: number };
		languages: string[];
		skills: Skill[];
		portfolio: Project[];
		reviews: Review[];
		memberSince?: string;
	}

	// Default seed used when a brand-new user opens their profile
	const DEFAULT_PROFILE: Omit<ProfileData, 'name' | 'memberSince'> = {
		title: 'Full-Stack Web Developer & UI Engineer',
		role: 'freelancer',
		verified: false,
		availability: 'Available now',
		location: 'Berlin, Germany',
		hourlyRate: 45,
		bio: 'I design and build fast, accessible web products end-to-end — from the first frame to the final deploy. Tell me a bit about yourself and what you are looking for!',
		stats: { jobs: 0, successRate: 0, responseTime: '1h', rating: 0 },
		languages: ['English — Native'],
		skills: [
			{ name: 'Web Development', icon: '🌐', level: 90 },
			{ name: 'UI / UX Design', icon: '🎨', level: 75 }
		],
		portfolio: [],
		reviews: []
	};

	// ---------- State ----------

	let profile = $state<ProfileData | null>(null);
	let draft = $state<ProfileData | null>(null);
	let loaded = $state(false);
	let loadError = $state('');
	let editing = $state(false);
	let saving = $state(false);
	let saveError = $state('');
	let toast = $state('');
	let toastTimer: ReturnType<typeof setTimeout> | null = null;
	let activeTab = $state('about');

	const tabs = [
		{ id: 'about', label: 'About', icon: '👤' },
		{ id: 'skills', label: 'Skills', icon: '🛠️' },
		{ id: 'portfolio', label: 'Portfolio', icon: '🖼️' },
		{ id: 'reviews', label: 'Reviews', icon: '⭐' }
	];

	// ---------- Load / save ----------

	$effect(() => {
		if (!loaded) loadProfile();
	});

	async function loadProfile() {
		try {
			const res = await fetch('/api/profile');
			if (res.status === 401) {
				loadError = 'Please sign in to view your profile.';
				return;
			}
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data.error || 'Could not load your profile.');
			}
			if (data.profile) {
				profile = normalize(data.profile);
			} else {
				profile = await seedProfile();
			}
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Could not load your profile. Please try again.';
		} finally {
			loaded = true;
		}
	}

	function normalize(p: any): ProfileData {
		const reviews: Review[] = (p.reviews ?? []).map((r: any) => ({
			reviewerName: r.reviewerName ?? 'Anonymous',
			reviewerRole: r.reviewerRole ?? '',
			rating: Number(r.rating) || 5,
			date: r.date ?? '',
			text: r.text ?? ''
		}));
		const rating = reviews.length
			? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
			: 0;
		return {
			name: p.name ?? 'User',
			title: p.title ?? DEFAULT_PROFILE.title,
			role: p.role === 'client' ? 'client' : 'freelancer',
			verified: Boolean(p.verified),
			availability: p.availability || DEFAULT_PROFILE.availability,
			location: p.location || DEFAULT_PROFILE.location,
			hourlyRate: Number(p.hourly_rate) || 0,
			bio: p.bio || DEFAULT_PROFILE.bio,
			stats: {
				jobs: Number(p.jobs_done) || 0,
				successRate: Number(p.success_rate) || 0,
				responseTime: p.response_time || '1h',
				rating
			},
			languages: Array.isArray(p.languages) ? p.languages : [],
			skills: Array.isArray(p.skills) ? p.skills : [],
			portfolio: Array.isArray(p.portfolio) ? p.portfolio : [],
			reviews,
			memberSince: p.created_at
				? new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
				: undefined
		};
	}

	async function seedProfile(): Promise<ProfileData> {
		const user = $page.data.session?.user;
		const name = user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'User';
		const seeded: ProfileData = { name, ...DEFAULT_PROFILE };
		await putProfile(seeded);
		return seeded;
	}

	async function putProfile(p: ProfileData) {
		const res = await fetch('/api/profile', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(p)
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			throw new Error(data.error || 'Could not save profile');
		}
	}

	// ---------- Edit ----------

	function startEdit() {
		if (!profile) return;
		draft = deepClone(profile);
		editing = true;
		saveError = '';
	}

	async function saveEdit() {
		if (!draft) return;
		saving = true;
		saveError = '';
		try {
			await putProfile(draft);
			profile = deepClone(draft);
			editing = false;
			showToast('Profile saved');
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Could not save profile';
		} finally {
			saving = false;
		}
	}

	function cancelEdit() {
		editing = false;
		draft = null;
		saveError = '';
	}

	function deepClone<T>(o: T): T {
		return JSON.parse(JSON.stringify(o));
	}

	// List managers (operate on the draft)

	function addSkill() {
		if (!draft) return;
		draft.skills = [...draft.skills, { name: 'New skill', icon: '🛠️', level: 50 }];
	}

	function removeSkill(i: number) {
		if (!draft) return;
		draft.skills = draft.skills.filter((_, idx) => idx !== i);
	}

	function addLanguage() {
		if (!draft) return;
		draft.languages = [...draft.languages, ''];
	}

	function removeLanguage(i: number) {
		if (!draft) return;
		draft.languages = draft.languages.filter((_, idx) => idx !== i);
	}

	function addProject() {
		if (!draft) return;
		draft.portfolio = [
			...draft.portfolio,
			{
				title: 'New Project',
				category: 'Web App',
				icon: '💻',
				year: new Date().getFullYear(),
				blurb: '',
				gradient: gradientChoices[draft.portfolio.length % gradientChoices.length]
			}
		];
	}

	function removeProject(i: number) {
		if (!draft) return;
		draft.portfolio = draft.portfolio.filter((_, idx) => idx !== i);
	}

	function addReview() {
		if (!draft) return;
		draft.reviews = [
			...draft.reviews,
			{ reviewerName: '', reviewerRole: '', rating: 5, date: '', text: '' }
		];
	}

	function removeReview(i: number) {
		if (!draft) return;
		draft.reviews = draft.reviews.filter((_, idx) => idx !== i);
	}

	// ---------- Misc ----------

	async function share() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			showToast('Profile link copied');
		} catch {
			showToast('Could not copy link');
		}
	}

	function showToast(msg: string) {
		toast = msg;
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = ''), 2200);
	}

	function stars(rating: number) {
		return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
	}

	const availabilityTone = (a: string) =>
		a === 'Available now' ? 'avail-green' : a === 'In a meeting' ? 'avail-gold' : 'avail-red';
</script>

<div class="profile">
	<span class="proto-badge">⚡ PROFILE — saved to your account</span>

	{#if !loaded}
		<div class="skeleton">
			<div class="sk sk-hero"></div>
			<div class="sk sk-row"></div>
			<div class="sk sk-tabs"></div>
		</div>
	{:else if loadError}
		<div class="error-state">
			<div class="error-icon">⚠️</div>
			<p>{loadError}</p>
			<a class="btn btn-primary" href="/">Back to app</a>
		</div>
	{:else if profile}
		<!-- ===================== HERO ===================== -->
		<section class="hero-card">
			<div class="cover">
				<div class="cover-shine"></div>
			</div>

			<div class="hero-body">
				<div class="avatar-wrap">
					<div class="avatar">{initials(profile.name)}</div>
					{#if profile.verified}
						<span class="verified-badge" title="Verified">✓</span>
					{/if}
				</div>

				<div class="hero-main">
					{#if editing && draft}
						<label class="edit-field">
							<span class="field-label">Name</span>
							<input type="text" bind:value={draft.name} maxlength="40" />
						</label>
					{:else}
						<div class="name-row">
							<h1 class="name">{profile.name}</h1>
						</div>
					{/if}

					{#if editing && draft}
						<label class="edit-field">
							<span class="field-label">Title</span>
							<input type="text" bind:value={draft.title} maxlength="80" />
						</label>
					{:else}
						<p class="title">{profile.title}</p>
					{/if}

					<div class="chip-row">
						{#if editing && draft}
							<div class="segmented">
								{#each roleOptions as opt}
									<button
										type="button"
										class="seg-btn"
										class:selected={draft!.role === opt.value}
										onclick={() => (draft!.role = opt.value)}
									>
										{opt.icon} {opt.label}
									</button>
								{/each}
							</div>
							<div class="segmented">
								{#each availabilityOptions as opt}
									<button
										type="button"
										class="seg-btn"
										class:selected={draft!.availability === opt}
										onclick={() => (draft!.availability = opt)}
									>
										{opt}
									</button>
								{/each}
							</div>
						{:else}
							<span class="chip chip-role">
								{profile.role === 'freelancer' ? '⚡ Freelancer' : '💼 Client'}
							</span>
							<span class="chip chip-avail {availabilityTone(profile.availability)}">
								<span class="avail-dot"></span>
								{profile.availability}
							</span>
						{/if}
					</div>

					{#if editing && draft}
						<label class="edit-field">
							<span class="field-label">Location</span>
							<input type="text" bind:value={draft.location} maxlength="60" />
						</label>
					{:else}
						<p class="meta">
							<span>📍 {profile.location}</span>
							{#if profile.memberSince}
								<span class="meta-sep">·</span>
								<span>Member since {profile.memberSince}</span>
							{/if}
						</p>
					{/if}
				</div>

				<div class="hero-actions">
					{#if editing}
						<button class="btn btn-ghost" onclick={cancelEdit}>Cancel</button>
						<button class="btn btn-primary" onclick={saveEdit} disabled={saving}>
							{saving ? 'Saving…' : 'Save Profile'}
						</button>
					{:else}
						<button class="btn btn-primary" onclick={startEdit}>✏️ Edit Profile</button>
						<button class="btn btn-ghost" onclick={share}>🔗 Share</button>
					{/if}
				</div>
			</div>

			<!-- ===================== STATS ===================== -->
			<div class="stats-row">
				<div class="stat">
					<span class="stat-value">{profile.stats.jobs}</span>
					<span class="stat-label">Jobs Done</span>
				</div>
				<div class="stat">
					<span class="stat-value">{profile.stats.successRate > 0 ? `${profile.stats.successRate}%` : '—'}</span>
					<span class="stat-label">Success Rate</span>
				</div>
				<div class="stat">
					<span class="stat-value">{profile.stats.responseTime}</span>
					<span class="stat-label">Response Time</span>
				</div>
				<div class="stat">
					<span class="stat-value">{profile.stats.rating > 0 ? `${profile.stats.rating}★` : '—'}</span>
					<span class="stat-label">Rating</span>
				</div>
				<div class="stat stat-rate">
					{#if editing && draft}
						<label class="edit-field edit-field--inline">
							<span class="field-label">Rate /hr</span>
							<div class="rate-input">
								<span>$</span>
								<input type="number" bind:value={draft.hourlyRate} min="0" max="999" />
							</div>
						</label>
					{:else}
						<span class="stat-value">${profile.hourlyRate}<small>/hr</small></span>
						<span class="stat-label">Hourly Rate</span>
					{/if}
				</div>
			</div>
		</section>

		{#if editing && draft}
			<!-- ===================== BUILDER ===================== -->
			<section class="builder">
				<div class="builder-head">
					<h2 class="builder-title">Profile Builder</h2>
					<span class="builder-hint">Everything below is saved to your account</span>
				</div>

				{#if saveError}
					<div class="save-error">⚠ {saveError}</div>
				{/if}

				<div class="builder-section">
					<h3 class="b-section-title">Basics</h3>
					<div class="b-grid">
						<label class="edit-field">
							<span class="field-label">Bio</span>
							<textarea class="bio-input" bind:value={draft.bio} rows="4" maxlength="600"></textarea>
						</label>
						<label class="switch-row">
							<input type="checkbox" bind:checked={draft.verified} />
							<span class="switch-track"><span class="switch-thumb"></span></span>
							<span class="switch-label">Verified badge ✓ <small>shown next to your name</small></span>
						</label>
					</div>
				</div>

				<div class="builder-section">
					<h3 class="b-section-title">Stats</h3>
					<div class="b-grid b-grid--3">
						<label class="edit-field">
							<span class="field-label">Jobs Done</span>
							<input type="number" bind:value={draft.stats.jobs} min="0" />
						</label>
						<label class="edit-field">
							<span class="field-label">Success Rate %</span>
							<input type="number" bind:value={draft.stats.successRate} min="0" max="100" />
						</label>
						<label class="edit-field">
							<span class="field-label">Response Time</span>
							<input type="text" bind:value={draft.stats.responseTime} maxlength="10" />
						</label>
					</div>
				</div>

				<div class="builder-section">
					<div class="b-section-head">
						<h3 class="b-section-title">Skills</h3>
						<button class="btn btn-add" onclick={addSkill}>＋ Add skill</button>
					</div>
					{#if draft.skills.length === 0}
						<p class="b-empty">No skills yet — add your first one.</p>
					{:else}
						<div class="b-list">
							{#each draft.skills as skill, i (i)}
								<div class="b-item">
									<select class="b-icon" bind:value={draft.skills[i].icon}>
										{#each iconChoices as ic}
											<option value={ic}>{ic}</option>
										{/each}
									</select>
									<input class="b-name" type="text" bind:value={draft.skills[i].name} placeholder="Skill name" maxlength="40" />
									<input class="b-range" type="range" min="0" max="100" bind:value={draft.skills[i].level} />
									<span class="b-level">{draft.skills[i].level}%</span>
									<button class="b-remove" aria-label="Remove skill" onclick={() => removeSkill(i)}>✕</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<div class="builder-section">
					<div class="b-section-head">
						<h3 class="b-section-title">Languages</h3>
						<button class="btn btn-add" onclick={addLanguage}>＋ Add language</button>
					</div>
					{#if draft.languages.length === 0}
						<p class="b-empty">No languages yet.</p>
					{:else}
						<div class="lang-chips">
							{#each draft.languages as lang, i (i)}
								<span class="lang-chip">
									<input type="text" bind:value={draft.languages[i]} placeholder="e.g. Spanish — Fluent" maxlength="40" />
									<button class="chip-remove" aria-label="Remove language" onclick={() => removeLanguage(i)}>✕</button>
								</span>
							{/each}
						</div>
					{/if}
				</div>

				<div class="builder-section">
					<div class="b-section-head">
						<h3 class="b-section-title">Portfolio</h3>
						<button class="btn btn-add" onclick={addProject}>＋ Add project</button>
					</div>
					{#if draft.portfolio.length === 0}
						<p class="b-empty">No projects yet — showcase your work.</p>
					{:else}
						<div class="b-list">
							{#each draft.portfolio as project, i (i)}
								<div class="b-item b-item--project">
									<select class="b-icon" bind:value={draft.portfolio[i].icon}>
										{#each iconChoices as ic}
											<option value={ic}>{ic}</option>
										{/each}
									</select>
									<div class="b-project-fields">
										<div class="b-project-row">
											<input class="b-name" type="text" bind:value={draft.portfolio[i].title} placeholder="Project title" maxlength="40" />
											<input class="b-cat" type="text" bind:value={draft.portfolio[i].category} placeholder="Category" maxlength="30" />
											<input class="b-year" type="number" bind:value={draft.portfolio[i].year} placeholder="Year" min="2000" max="2100" />
										</div>
										<input class="b-blurb" type="text" bind:value={draft.portfolio[i].blurb} placeholder="Short description" maxlength="120" />
									</div>
									<button class="b-remove" aria-label="Remove project" onclick={() => removeProject(i)}>✕</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<div class="builder-section">
					<div class="b-section-head">
						<h3 class="b-section-title">Reviews</h3>
						<button class="btn btn-add" onclick={addReview}>＋ Add review</button>
					</div>
					{#if draft.reviews.length === 0}
						<p class="b-empty">No reviews yet.</p>
					{:else}
						<div class="b-list">
							{#each draft.reviews as review, i (i)}
								<div class="b-item b-item--review">
									<div class="b-project-fields">
										<div class="b-project-row">
											<input class="b-name" type="text" bind:value={draft.reviews[i].reviewerName} placeholder="Reviewer name" maxlength="40" />
											<input class="b-cat" type="text" bind:value={draft.reviews[i].reviewerRole} placeholder="Their role" maxlength="40" />
											<input class="b-year" type="text" bind:value={draft.reviews[i].date} placeholder="Date" maxlength="12" />
										</div>
										<div class="b-review-row">
											<select class="b-rating" bind:value={draft.reviews[i].rating}>
												{#each [5, 4, 3, 2, 1] as n}
													<option value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</option>
												{/each}
											</select>
											<input class="b-blurb" type="text" bind:value={draft.reviews[i].text} placeholder="Review text" maxlength="400" />
										</div>
									</div>
									<button class="b-remove" aria-label="Remove review" onclick={() => removeReview(i)}>✕</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<div class="builder-actions">
					<button class="btn btn-ghost" onclick={cancelEdit}>Cancel</button>
					<button class="btn btn-primary btn-save" onclick={saveEdit} disabled={saving}>
						{saving ? 'Saving…' : 'Save Changes'}
					</button>
				</div>
			</section>
		{:else}
			<!-- ===================== TABS ===================== -->
			<div class="tabs">
				{#each tabs as tab}
					<button
						class="tab"
						class:active={activeTab === tab.id}
						onclick={() => (activeTab = tab.id)}
					>
						<span class="tab-icon">{tab.icon}</span>
						{tab.label}
					</button>
				{/each}
			</div>

			<!-- ===================== CONTENT ===================== -->
			<section class="tab-content">
				{#if activeTab === 'about'}
					<div class="about-grid">
						<div class="panel panel-bio">
							<h3 class="panel-title">About</h3>
							<p class="bio">{profile.bio}</p>
						</div>

						<div class="side-column">
							<div class="panel">
								<h3 class="panel-title">Languages</h3>
								{#if profile.languages.length === 0}
									<p class="b-empty">No languages added yet.</p>
								{:else}
									<ul class="lang-list">
										{#each profile.languages as lang}
											<li class="lang-item"><span class="lang-dot"></span>{lang}</li>
										{/each}
									</ul>
								{/if}
							</div>

							<div class="panel">
								<h3 class="panel-title">Quick Facts</h3>
								<ul class="facts">
									<li><span>Experience</span><strong>{profile.stats.jobs > 0 ? `${Math.max(1, Math.round(profile.stats.jobs / 24))}+ years` : 'New'}</strong></li>
									<li><span>Projects</span><strong>{profile.stats.jobs}</strong></li>
									<li><span>Focus</span><strong>{profile.skills.length} skill areas</strong></li>
								</ul>
							</div>
						</div>
					</div>

				{:else if activeTab === 'skills'}
					<div class="skills-panel">
						<h3 class="panel-title">Skills & Expertise</h3>
						{#if profile.skills.length === 0}
							<p class="b-empty">No skills added yet — hit Edit Profile to add some.</p>
						{:else}
							<div class="skills-list">
								{#each profile.skills as skill}
									<div class="skill-row">
										<span class="skill-icon">{skill.icon}</span>
										<div class="skill-main">
											<div class="skill-head">
												<span class="skill-name">{skill.name}</span>
												<span class="skill-level">{skill.level}%</span>
											</div>
											<div class="skill-bar">
												<div class="skill-fill" style="width: {skill.level}%"></div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>

				{:else if activeTab === 'portfolio'}
					{#if profile.portfolio.length === 0}
						<div class="panel">
							<p class="b-empty">No projects yet — hit Edit Profile to showcase your work.</p>
						</div>
					{:else}
						<div class="portfolio-grid">
							{#each profile.portfolio as item}
								<div class="project-card">
									<div class="project-thumb {item.gradient}">
										<span class="project-icon">{item.icon}</span>
										<span class="project-year">{item.year}</span>
									</div>
									<div class="project-body">
										<h4 class="project-title">{item.title}</h4>
										<span class="project-cat">{item.category}</span>
										<p class="project-blurb">{item.blurb}</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}

				{:else}
					<div class="reviews-list">
						<div class="review-summary">
							<div class="summary-rating">
								<span class="summary-number">{profile.stats.rating > 0 ? profile.stats.rating : '—'}</span>
								<span class="summary-stars">{stars(profile.stats.rating)}</span>
								<span class="summary-count">
									based on {profile.reviews.length}{profile.reviews.length === 1 ? ' review' : ' reviews'}
								</span>
							</div>
						</div>
						{#if profile.reviews.length === 0}
							<div class="panel">
								<p class="b-empty">No reviews yet.</p>
							</div>
						{:else}
							{#each profile.reviews as review}
								<div class="review-card">
									<div class="review-avatar">{initials(review.reviewerName)}</div>
									<div class="review-main">
										<div class="review-head">
											<div>
												<span class="review-name">{review.reviewerName}</span>
												<span class="review-role">{review.reviewerRole}</span>
											</div>
											<div class="review-meta">
												<span class="review-stars">{stars(review.rating)}</span>
												<span class="review-date">{review.date}</span>
											</div>
										</div>
										<p class="review-text">{review.text}</p>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				{/if}
			</section>
		{/if}
	{/if}

	{#if toast}
		<div class="toast">✓ {toast}</div>
	{/if}
</div>

<style>
	.profile {
		width: 100%;
		max-width: 760px;
		margin: 0 auto;
		animation: fadeIn 0.4s ease;
		position: relative;
	}

	.proto-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.8px;
		text-transform: uppercase;
		color: var(--gold);
		background: rgba(255, 215, 0, 0.08);
		border: 1px solid rgba(255, 215, 0, 0.3);
		border-radius: 999px;
		padding: 0.35rem 0.9rem;
		margin-bottom: 1.25rem;
	}

	/* ---------- Skeleton / error ---------- */

	.skeleton {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.sk {
		background: linear-gradient(100deg, #0d1428 40%, #131c36 50%, #0d1428 60%);
		background-size: 200% 100%;
		animation: shimmer 1.4s infinite;
		border-radius: 1rem;
	}

	.sk-hero { height: 260px; }
	.sk-row { height: 90px; }
	.sk-tabs { height: 50px; }

	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		text-align: center;
		padding: 3rem 1rem;
		color: var(--text-2);
	}

	.error-icon { font-size: 2.4rem; }

	/* ---------- Hero ---------- */

	.hero-card {
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.92), rgba(10, 15, 30, 0.97));
		border: 1px solid var(--border);
		border-radius: 1.4rem;
		overflow: hidden;
		box-shadow: var(--shadow-card);
	}

	.cover {
		position: relative;
		height: 120px;
		background:
			radial-gradient(600px 200px at 20% -40%, rgba(255, 215, 0, 0.28), transparent 60%),
			radial-gradient(500px 220px at 80% -30%, rgba(91, 140, 255, 0.3), transparent 55%),
			linear-gradient(135deg, #1a2547, #0e1529 55%, #161d3a);
		overflow: hidden;
	}

	.cover::after {
		content: '';
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			115deg,
			transparent 0 18px,
			rgba(255, 255, 255, 0.03) 18px 19px
		);
	}

	.cover-shine {
		position: absolute;
		top: -60%;
		left: -20%;
		width: 50%;
		height: 220%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
		transform: rotate(20deg);
		animation: shine 6s ease-in-out infinite;
	}

	.hero-body {
		display: flex;
		align-items: flex-start;
		gap: 1.4rem;
		padding: 0 1.75rem 1.5rem;
		margin-top: -38px;
		position: relative;
	}

	.avatar-wrap {
		position: relative;
		flex-shrink: 0;
		width: 92px;
		height: 92px;
		border-radius: 50%;
		padding: 3px;
		background: conic-gradient(from 210deg, #ffd700, #ff9d2e, #ff5d73, #5b8cff, #ffd700);
		box-shadow: 0 8px 30px -8px var(--gold-glow);
	}

	.avatar {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: linear-gradient(160deg, #131c36, #0a0f1e);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--gold);
	}

	.verified-badge {
		position: absolute;
		bottom: 4px;
		right: 2px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: linear-gradient(135deg, #34d399, #10b981);
		color: #04110c;
		font-size: 0.78rem;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2.5px solid #0e1529;
	}

	.hero-main {
		flex: 1;
		min-width: 0;
		padding-top: 2.2rem;
	}

	.name-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.name {
		font-size: 1.7rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--text);
		letter-spacing: -0.02em;
	}

	.title {
		color: var(--text-2);
		font-size: 0.98rem;
		margin-top: 0.3rem;
	}

	.chip-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		margin-top: 0.9rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.78rem;
		font-weight: 600;
		border-radius: 999px;
		padding: 0.35rem 0.8rem;
	}

	.chip-role {
		background: rgba(255, 215, 0, 0.1);
		border: 1px solid rgba(255, 215, 0, 0.35);
		color: var(--gold);
	}

	.chip-avail {
		border: 1px solid var(--border-strong);
		color: var(--text-2);
	}

	.chip-avail.avail-green { color: var(--success); border-color: rgba(52, 211, 153, 0.35); background: rgba(52, 211, 153, 0.08); }
	.chip-avail.avail-gold { color: var(--gold); border-color: rgba(255, 215, 0, 0.35); background: rgba(255, 215, 0, 0.08); }
	.chip-avail.avail-red { color: var(--danger); border-color: rgba(255, 93, 115, 0.35); background: rgba(255, 93, 115, 0.08); }

	.avail-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: currentColor;
		box-shadow: 0 0 8px currentColor;
		animation: blink 1.6s ease-in-out infinite;
	}

	.meta {
		color: var(--text-3);
		font-size: 0.82rem;
		margin-top: 0.8rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.meta-sep {
		opacity: 0.6;
	}

	.hero-actions {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding-top: 2.1rem;
		flex-shrink: 0;
	}

	.btn {
		border: none;
		border-radius: 0.6rem;
		padding: 0.6rem 1.2rem;
		font-size: 0.85rem;
		font-weight: 700;
		font-family: var(--font-display);
		cursor: pointer;
		transition: all 0.22s ease;
		white-space: nowrap;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		color: #0a0e1a;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		box-shadow: var(--shadow-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.btn-primary:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 10px 30px -6px var(--gold-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.btn-ghost {
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text-2);
	}

	.btn-ghost:hover {
		border-color: rgba(91, 140, 255, 0.5);
		color: var(--blue);
		background: rgba(91, 140, 255, 0.06);
	}

	/* ---------- Stats ---------- */

	.stats-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr) 1.3fr;
		border-top: 1px solid var(--border);
		background: rgba(10, 15, 30, 0.5);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 1.1rem 0.5rem;
		border-right: 1px solid var(--border);
	}

	.stat:last-child {
		border-right: none;
	}

	.stat-value {
		font-size: 1.3rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--text);
	}

	.stat-value small {
		font-size: 0.7rem;
		color: var(--text-3);
		font-weight: 600;
	}

	.stat-label {
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.8px;
		color: var(--text-3);
	}

	/* ---------- Edit fields (shared) ---------- */

	.edit-field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		margin: 0.2rem 0;
	}

	.field-label {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.7px;
		color: var(--text-3);
	}

	.edit-field input,
	.edit-field textarea {
		background: rgba(6, 10, 23, 0.75);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0.55rem 0.8rem;
		color: var(--text);
		font-size: 0.92rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
		width: 100%;
		box-sizing: border-box;
	}

	.edit-field input:focus,
	.edit-field textarea:focus {
		border-color: var(--gold);
		box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.14);
	}

	.edit-field--inline .rate-input {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		background: rgba(6, 10, 23, 0.75);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0 0.7rem;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.edit-field--inline .rate-input:focus-within {
		border-color: var(--gold);
		box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.14);
	}

	.rate-input span {
		color: var(--text-3);
		font-size: 0.9rem;
	}

	.rate-input input {
		border: none;
		background: transparent;
		padding: 0.45rem 0;
		box-shadow: none !important;
		width: 56px;
	}

	.bio-input {
		resize: vertical;
		line-height: 1.5;
	}

	.switch-row {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		cursor: pointer;
		width: fit-content;
	}

	.switch-row input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.switch-track {
		position: relative;
		width: 42px;
		height: 24px;
		border-radius: 999px;
		background: rgba(6, 10, 23, 0.8);
		border: 1px solid var(--border-strong);
		transition: background 0.25s ease, border-color 0.25s ease;
		flex-shrink: 0;
	}

	.switch-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--text-3);
		transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.25s ease;
	}

	.switch-row input:checked + .switch-track {
		background: linear-gradient(135deg, #34d399, #10b981);
		border-color: transparent;
	}

	.switch-row input:checked + .switch-track .switch-thumb {
		transform: translateX(18px);
		background: #04110c;
	}

	.switch-row input:focus-visible + .switch-track {
		box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.2);
	}

	.switch-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text);
	}

	.switch-label small {
		display: block;
		font-weight: 400;
		font-size: 0.72rem;
		color: var(--text-3);
	}

	.segmented {
		display: inline-flex;
		background: rgba(6, 10, 23, 0.75);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.2rem;
		gap: 0.15rem;
	}

	.seg-btn {
		background: transparent;
		border: none;
		color: var(--text-2);
		font-size: 0.75rem;
		font-weight: 600;
		font-family: inherit;
		padding: 0.3rem 0.7rem;
		border-radius: 999px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.seg-btn.selected {
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
	}

	/* ---------- Builder ---------- */

	.builder {
		margin-top: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	.builder-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.builder-title {
		font-size: 1.3rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--gold);
	}

	.builder-hint {
		font-size: 0.8rem;
		color: var(--text-3);
	}

	.save-error {
		background: rgba(255, 93, 115, 0.08);
		border: 1px solid rgba(255, 93, 115, 0.28);
		color: #ff8fa3;
		padding: 0.7rem 1rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
	}

	.builder-section {
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.9), rgba(10, 15, 30, 0.95));
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 1.3rem 1.4rem;
		box-shadow: var(--shadow-card);
	}

	.b-section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.b-section-title {
		font-size: 0.95rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--text);
	}

	.btn-add {
		background: rgba(255, 215, 0, 0.1);
		border: 1px solid rgba(255, 215, 0, 0.35);
		color: var(--gold);
		font-size: 0.78rem;
		padding: 0.4rem 0.9rem;
		border-radius: 999px;
	}

	.btn-add:hover {
		background: rgba(255, 215, 0, 0.18);
	}

	.b-empty {
		color: var(--text-3);
		font-size: 0.85rem;
	}

	.b-grid {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.b-grid--3 {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.9rem;
	}

	.b-list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.b-item {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		background: rgba(6, 10, 23, 0.5);
		border: 1px solid var(--border);
		border-radius: 0.7rem;
		padding: 0.6rem;
	}

	.b-item--project,
	.b-item--review {
		align-items: flex-start;
	}

	.b-icon {
		width: 48px;
		flex-shrink: 0;
		background: rgba(6, 10, 23, 0.75);
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		padding: 0.4rem;
		color: var(--text);
		font-size: 1rem;
		text-align: center;
		appearance: none;
		-webkit-appearance: none;
		cursor: pointer;
	}

	.b-name {
		flex: 2;
	}

	.b-cat {
		flex: 1.2;
	}

	.b-year {
		width: 74px;
		flex-shrink: 0;
	}

	.b-level {
		width: 42px;
		text-align: right;
		font-size: 0.78rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--gold);
		flex-shrink: 0;
	}

	.b-range {
		flex: 1;
		min-width: 90px;
		accent-color: #ffd700;
		cursor: pointer;
	}

	.b-remove {
		width: 28px;
		height: 28px;
		flex-shrink: 0;
		border-radius: 50%;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--text-3);
		cursor: pointer;
		font-size: 0.75rem;
		transition: all 0.2s ease;
	}

	.b-remove:hover {
		border-color: rgba(255, 93, 115, 0.5);
		color: var(--danger);
		background: rgba(255, 93, 115, 0.08);
	}

	.b-project-fields {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 0;
	}

	.b-project-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.b-project-row input {
		background: rgba(6, 10, 23, 0.75);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0.5rem 0.7rem;
		color: var(--text);
		font-size: 0.88rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
		box-sizing: border-box;
	}

	.b-project-row input:focus {
		border-color: var(--gold);
		box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.14);
	}

	.b-blurb {
		background: rgba(6, 10, 23, 0.75);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0.5rem 0.7rem;
		color: var(--text);
		font-size: 0.88rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
		width: 100%;
		box-sizing: border-box;
	}

	.b-blurb:focus {
		border-color: var(--gold);
		box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.14);
	}

	.b-review-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.b-rating {
		background: rgba(6, 10, 23, 0.75);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0.5rem 0.6rem;
		color: var(--gold);
		font-size: 0.85rem;
		cursor: pointer;
		font-family: inherit;
	}

	.lang-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.lang-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		background: rgba(6, 10, 23, 0.75);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.3rem 0.4rem 0.3rem 0.85rem;
		transition: border-color 0.2s ease;
	}

	.lang-chip:focus-within {
		border-color: var(--gold);
	}

	.lang-chip input {
		background: transparent;
		border: none;
		outline: none;
		color: var(--text);
		font-size: 0.85rem;
		font-family: inherit;
		width: 150px;
	}

	.chip-remove {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 93, 115, 0.15);
		color: var(--danger);
		cursor: pointer;
		font-size: 0.65rem;
		transition: all 0.2s ease;
	}

	.chip-remove:hover {
		background: rgba(255, 93, 115, 0.35);
		color: #fff;
	}

	.builder-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.btn-save {
		padding: 0.75rem 2rem;
		font-size: 0.95rem;
	}

	/* ---------- Tabs ---------- */

	.tabs {
		display: flex;
		gap: 0.35rem;
		margin: 1.6rem 0 1.1rem;
		background: rgba(10, 15, 30, 0.6);
		border: 1px solid var(--border);
		border-radius: 0.9rem;
		padding: 0.3rem;
		overflow-x: auto;
	}

	.tab {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		flex: 1;
		justify-content: center;
		background: transparent;
		border: none;
		color: var(--text-2);
		font-size: 0.85rem;
		font-weight: 600;
		font-family: inherit;
		padding: 0.55rem 0.75rem;
		border-radius: 0.65rem;
		cursor: pointer;
		transition: all 0.22s ease;
		white-space: nowrap;
	}

	.tab-icon {
		font-size: 0.95rem;
	}

	.tab:hover {
		color: var(--text);
	}

	.tab.active {
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.95), rgba(10, 15, 30, 0.98));
		border: 1px solid rgba(255, 215, 0, 0.35);
		color: var(--gold);
		box-shadow: var(--shadow-card);
	}

	/* ---------- Panels ---------- */

	.tab-content {
		animation: fadeIn 0.3s ease;
	}

	.panel {
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.9), rgba(10, 15, 30, 0.95));
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 1.4rem 1.5rem;
		box-shadow: var(--shadow-card);
	}

	.panel-title {
		font-size: 1rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--text);
		margin-bottom: 1rem;
	}

	.about-grid {
		display: grid;
		grid-template-columns: 1.6fr 1fr;
		gap: 1.1rem;
	}

	.side-column {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	.bio {
		color: var(--text-2);
		font-size: 0.92rem;
		line-height: 1.7;
		white-space: pre-wrap;
	}

	.lang-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.lang-item {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		color: var(--text-2);
		font-size: 0.85rem;
	}

	.lang-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
	}

	.facts {
		list-style: none;
		display: flex;
		flex-direction: column;
	}

	.facts li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.55rem 0;
		font-size: 0.85rem;
	}

	.facts li + li {
		border-top: 1px solid var(--border);
	}

	.facts li span {
		color: var(--text-3);
	}

	.facts li strong {
		color: var(--text);
		font-weight: 600;
	}

	/* ---------- Skills ---------- */

	.skills-panel {
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.9), rgba(10, 15, 30, 0.95));
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 1.5rem 1.6rem;
		box-shadow: var(--shadow-card);
	}

	.skills-list {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
	}

	.skill-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.skill-icon {
		width: 42px;
		height: 42px;
		flex-shrink: 0;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
		background: rgba(255, 215, 0, 0.07);
		border: 1px solid rgba(255, 215, 0, 0.16);
	}

	.skill-main {
		flex: 1;
		min-width: 0;
	}

	.skill-head {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.45rem;
	}

	.skill-name {
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 600;
	}

	.skill-level {
		color: var(--gold);
		font-size: 0.8rem;
		font-weight: 700;
		font-family: var(--font-display);
	}

	.skill-bar {
		height: 8px;
		background: rgba(6, 10, 23, 0.8);
		border-radius: 999px;
		overflow: hidden;
		border: 1px solid var(--border);
	}

	.skill-fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, #ffb800, #ffd700);
		box-shadow: 0 0 12px rgba(255, 215, 0, 0.4);
		transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
	}

	/* ---------- Portfolio ---------- */

	.portfolio-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.1rem;
	}

	.project-card {
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.9), rgba(10, 15, 30, 0.95));
		border: 1px solid var(--border);
		border-radius: 1rem;
		overflow: hidden;
		transition: all 0.25s ease;
		box-shadow: var(--shadow-card);
	}

	.project-card:hover {
		transform: translateY(-4px);
		border-color: rgba(255, 215, 0, 0.4);
		box-shadow: 0 18px 44px -18px rgba(0, 0, 0, 0.7), 0 0 30px -12px var(--gold-glow);
	}

	.project-thumb {
		position: relative;
		height: 96px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.project-thumb.g1 { background: linear-gradient(135deg, #ffd700, #ff9d2e); }
	.project-thumb.g2 { background: linear-gradient(135deg, #5b8cff, #8a5bff); }
	.project-thumb.g3 { background: linear-gradient(135deg, #34d399, #10b981); }
	.project-thumb.g4 { background: linear-gradient(135deg, #ff5d73, #ff9d2e); }
	.project-thumb.g5 { background: linear-gradient(135deg, #8a5bff, #ff5d73); }
	.project-thumb.g6 { background: linear-gradient(135deg, #38bdf8, #5b8cff); }

	.project-icon {
		font-size: 2.2rem;
		filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35));
	}

	.project-year {
		position: absolute;
		top: 0.6rem;
		right: 0.7rem;
		font-size: 0.66rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.9);
		background: rgba(6, 10, 23, 0.35);
		border-radius: 999px;
		padding: 0.2rem 0.55rem;
		backdrop-filter: blur(4px);
	}

	.project-body {
		padding: 0.9rem 1rem 1.1rem;
	}

	.project-title {
		font-size: 0.95rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--text);
		margin-bottom: 0.2rem;
	}

	.project-cat {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.7px;
		color: var(--gold);
	}

	.project-blurb {
		font-size: 0.78rem;
		color: var(--text-3);
		line-height: 1.45;
		margin-top: 0.5rem;
	}

	/* ---------- Reviews ---------- */

	.reviews-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.review-summary {
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.9), rgba(10, 15, 30, 0.95));
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 1.3rem 1.6rem;
		box-shadow: var(--shadow-card);
	}

	.summary-rating {
		display: flex;
		align-items: baseline;
		gap: 0.9rem;
		flex-wrap: wrap;
	}

	.summary-number {
		font-size: 2.4rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--gold);
	}

	.summary-stars {
		color: var(--gold);
		font-size: 1.1rem;
		letter-spacing: 2px;
	}

	.summary-count {
		color: var(--text-3);
		font-size: 0.82rem;
	}

	.review-card {
		display: flex;
		gap: 1.1rem;
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.85), rgba(10, 15, 30, 0.92));
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 1.3rem 1.5rem;
		box-shadow: var(--shadow-card);
		transition: border-color 0.2s ease;
	}

	.review-card:hover {
		border-color: var(--border-strong);
	}

	.review-avatar {
		width: 42px;
		height: 42px;
		flex-shrink: 0;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.85rem;
		font-weight: 700;
		font-family: var(--font-display);
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
	}

	.review-main {
		flex: 1;
		min-width: 0;
	}

	.review-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.review-name {
		display: block;
		font-size: 0.92rem;
		font-weight: 700;
		color: var(--text);
	}

	.review-role {
		display: block;
		font-size: 0.74rem;
		color: var(--text-3);
		margin-top: 0.15rem;
	}

	.review-meta {
		text-align: right;
		flex-shrink: 0;
	}

	.review-stars {
		display: block;
		color: var(--gold);
		font-size: 0.85rem;
		letter-spacing: 1.5px;
	}

	.review-date {
		display: block;
		font-size: 0.7rem;
		color: var(--text-3);
		margin-top: 0.2rem;
	}

	.review-text {
		color: var(--text-2);
		font-size: 0.88rem;
		line-height: 1.6;
	}

	/* ---------- Toast ---------- */

	.toast {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		background: linear-gradient(135deg, #34d399, #10b981);
		color: #04110c;
		font-size: 0.88rem;
		font-weight: 700;
		font-family: var(--font-display);
		padding: 0.7rem 1.5rem;
		border-radius: 999px;
		box-shadow: 0 12px 40px -10px rgba(52, 211, 153, 0.6);
		animation: toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		z-index: 100;
	}

	@keyframes toastIn {
		from { opacity: 0; transform: translate(-50%, 14px) scale(0.9); }
		to { opacity: 1; transform: translate(-50%, 0) scale(1); }
	}

	@keyframes blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.35; }
	}

	@keyframes shine {
		0%, 60% { left: -40%; }
		100% { left: 130%; }
	}

	@keyframes shimmer {
		from { background-position: 200% 0; }
		to { background-position: -200% 0; }
	}

	@media (max-width: 720px) {
		.hero-body {
			flex-direction: column;
			align-items: center;
			text-align: center;
			padding-top: 0.5rem;
		}

		.hero-main {
			padding-top: 0;
		}

		.hero-actions {
			flex-direction: row;
			padding-top: 0;
		}

		.meta {
			justify-content: center;
		}

		.stats-row {
			grid-template-columns: repeat(3, 1fr);
		}

		.stat-rate {
			grid-column: span 3;
			border-top: 1px solid var(--border);
		}

		.about-grid {
			grid-template-columns: 1fr;
		}

		.portfolio-grid {
			grid-template-columns: 1fr 1fr;
		}

		.b-grid--3 {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 480px) {
		.portfolio-grid {
			grid-template-columns: 1fr;
		}

		.review-head {
			flex-direction: column;
			gap: 0.3rem;
		}

		.review-meta {
			text-align: left;
		}

		.b-project-row {
			flex-wrap: wrap;
		}

		.b-year {
			width: 100%;
		}
	}
</style>
