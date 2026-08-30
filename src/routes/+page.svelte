<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { queue } from '$lib/stores/queue.svelte';
	import { categories as popularCategories } from '$lib/data/categories';
	import type { Category } from '$lib/types';
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
			}
		}
	});

	// Load chat history once so the header badge is up to date
	let chatHistoryLoaded = $state(false);
	$effect(() => {
		if (queue.user && !chatHistoryLoaded) {
			chatHistoryLoaded = true;
			queue.loadChatHistory();
		}
	});


	async function handleLogout() {
		await queue.logout();
		await invalidateAll();
	}

	// Scroll-reveal animation
	function reveal(node: HTMLElement) {
		if (typeof IntersectionObserver === 'undefined') {
			node.classList.add('visible');
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						node.classList.add('visible');
						observer.disconnect();
					}
				}
			},
			{ threshold: 0.12 }
		);
		observer.observe(node);
		return {
			destroy() {
				observer.disconnect();
			}
		};
	}

	// Live categories from the API, falling back to the static list
	let liveCategories = $state<Category[] | null>(null);
	let categoriesLoaded = $state(false);

	$effect(() => {
		if (categoriesLoaded) return;
		let cancelled = false;
		fetch('/api/categories')
			.then((res) => (res.ok ? res.json() : null))
			.then((json) => {
				if (cancelled) return;
				const approved = (json?.categories ?? []).filter((c: Category) => c.status === 'approved');
				liveCategories = approved.length > 0 ? approved.slice(0, 8) : null;
			})
			.catch(() => {
				if (!cancelled) liveCategories = null;
			})
			.finally(() => {
				if (!cancelled) categoriesLoaded = true;
			});
		return () => {
			cancelled = true;
		};
	});

	const shownCategories = $derived(liveCategories ?? popularCategories);

	const steps = [
		{
			icon: '🎯',
			title: 'Pick your role',
			text: 'Tell us whether you are a client with work to do or a freelancer with skills to offer.'
		},
		{
			icon: '🗂️',
			title: 'Choose categories',
			text: 'Select the types of work you care about — from web development to video editing.'
		},
		{
			icon: '⚡',
			title: 'Get matched in real time',
			text: 'Our queue pairs you with the right person instantly, no bidding or endless scrolling.'
		},
		{
			icon: '💬',
			title: 'Chat & confirm',
			text: 'Discuss the project in a built-in chat and confirm the gig when you are ready.'
		}
	];

	const features = [
		{
			icon: '⚡',
			title: 'Real-time matching',
			text: 'Join the queue and get connected to a relevant partner within seconds — not days.'
		},
		{
			icon: '🚫',
			title: 'No bidding wars',
			text: 'Skip the race to the lowest price. Match on skills and interest, then negotiate fairly.'
		},
		{
			icon: '🗂️',
			title: 'Curated categories',
			text: 'Focused categories keep every match relevant, and you can request new ones anytime.'
		},
		{
			icon: '💬',
			title: 'Built-in chat',
			text: 'Every match opens a private 1:1 chat so you can scope, agree, and kick off the work.'
		},
		{
			icon: '🤝',
			title: 'Confirm & go',
			text: 'Both sides confirm the engagement so there is never any doubt about the next step.'
		},
		{
			icon: '🛡️',
			title: 'Community-driven',
			text: 'Category requests are reviewed by admins, keeping the marketplace clean and useful.'
		}
	];

	const roles = [
		{
			icon: '💼',
			accent: 'blue',
			title: 'For Clients',
			subtitle: 'Need work done? Find the right freelancer in seconds.',
			points: ['Get matched to skilled freelancers instantly', 'Skip proposals, bidding, and endless browsing', 'Chat directly, agree on scope, and confirm the gig'],
			cta: 'Find a freelancer'
		},
		{
			icon: '⚡',
			accent: 'gold',
			title: 'For Freelancers',
			subtitle: 'Turn your skills into real projects, without the hustle.',
			points: ['Get matched to clients who need your skills', 'No cold pitches — relevant work finds you', 'Built-in chat to scope projects and set terms'],
			cta: 'Find work'
		}
	];

	const testimonials = [
		{
			quote: 'I posted my needs and was matched with a developer in under a minute. We confirmed the project in the chat the same day.',
			name: 'Maya R.',
			role: 'Startup Founder',
			initials: 'MR'
		},
		{
			quote: 'No more bidding against a hundred other designers. I get matched to clients that actually fit my skillset.',
			name: 'Daniel K.',
			role: 'Freelance Designer',
			initials: 'DK'
		},
		{
			quote: 'The category system keeps everything relevant. Every match I have had so far has been a genuine fit.',
			name: 'Priya S.',
			role: 'Marketing Lead',
			initials: 'PS'
		}
	];

	let openFaq = $state<number | null>(0);

	const faqs = [
		{
			q: 'Is JobFinder free to use?',
			a: 'Yes — joining, matching, and chatting are completely free. Just create an account, pick your role and categories, and start getting matched.'
		},
		{
			q: 'How does the matching work?',
			a: 'When you start a search, you join a live queue for the categories you selected. We pair you with someone whose role complements yours — a client with a freelancer — as soon as a compatible match is available.'
		},
		{
			q: 'What happens after we are matched?',
			a: 'You get connected in a private 1:1 chat where you can discuss the project, agree on scope and terms, and confirm the engagement. Confirming lets both sides know the work is officially underway.'
		},
		{
			q: 'Can I request a category that is not listed?',
			a: 'Absolutely. You can submit a category request from inside the app — it gets reviewed by an admin and, once approved, becomes available for everyone.'
		},
		{
			q: 'Do I need to create an account first?',
			a: 'Yes, a quick sign-up is required so we can keep the queue authentic and make sure every match has a real person on both sides.'
		}
	];
</script>

<div class="landing">
	<header class="landing-header">
		<div class="header-inner">
			<a class="logo" href="/">
				<div class="logo-badge">🔍</div>
				<div class="logo-text-wrap">
					<span class="logo-text">JobFinder</span>
					<span class="logo-tag">match · connect · grow</span>
				</div>
			</a>

			<nav class="nav-links">
				<a href="#roles">For clients & freelancers</a>
				<a href="#how-it-works">How it works</a>
				<a href="#categories">Categories</a>
				<a href="#faq">FAQ</a>
			</nav>

			<div class="header-right">
				{#if queue.user}
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
						<a class="admin-link" href="/dashboard">🛡️ Admin</a>
					{/if}
					<a class="user-chip" href="/profile" title="View profile">
						<div class="user-avatar">{initials(queue.user.name)}</div>
						<span class="user-name">{queue.user.name}</span>
					</a>
					<button class="logout-btn" onclick={handleLogout}>Sign out</button>
				{:else}
					<a class="btn-ghost btn-sm" href="/app">Sign in</a>
					<a class="btn-primary btn-sm" href="/app">Get started</a>
				{/if}
			</div>
		</div>
	</header>

	<main>
		<!-- Hero -->
		<section class="hero">
			<div class="hero-grid" aria-hidden="true"></div>
			<div class="hero-inner">
				<div class="hero-badge" use:reveal>
					<span class="pulse-dot"></span>
					Real-time freelancer matching
				</div>
				<h1 class="hero-title" use:reveal>
					Find your perfect match
					<span class="gradient-text">in minutes</span>
				</h1>
				<p class="hero-subtitle" use:reveal>
					JobFinder connects clients with skilled freelancers in real time — no bidding wars,
					no endless scrolling. Tell us what you need and get matched instantly.
				</p>

				<div class="hero-actions" use:reveal>
					<a class="btn-primary" href="/app">
						Get started free
						<span class="btn-arrow">→</span>
					</a>
					<a class="btn-ghost" href="#how-it-works">See how it works</a>
				</div>

				<div class="trust-row" use:reveal>
					<span class="trust-item">✓ Free to join</span>
					<span class="trust-dot"></span>
					<span class="trust-item">✓ No bidding wars</span>
					<span class="trust-dot"></span>
					<span class="trust-item">✓ Matched in seconds</span>
				</div>

				<div class="hero-visual" use:reveal aria-hidden="true">
					<div class="float-badge float-badge--time">⏱ Matched in 12s</div>
					<div class="float-badge float-badge--confirm">✓ Both confirmed</div>

					<div class="chat-card">
						<div class="chat-head">
							<div class="chat-avatar gold">⚡</div>
							<div class="chat-meta">
								<span class="chat-name">Alex · Freelancer</span>
								<span class="chat-status">
									<span class="status-dot"></span>
									Web Development
								</span>
							</div>
							<span class="chat-pill">matched</span>
						</div>
						<div class="chat-body">
							<div class="bubble them">
								Hey! Saw you're looking for a landing page. I build them in about 3 days — happy to share examples.
							</div>
							<div class="bubble me">
								That's perfect timing. What would a full package look like?
							</div>
							<div class="typing">
								<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
								<span class="typing-label">Alex is typing…</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Roles -->
		<section class="section" id="roles">
			<div class="section-inner">
				<h2 class="section-eyebrow" use:reveal>Who it's for</h2>
				<h3 class="section-title" use:reveal>Built for both sides of the table</h3>

				<div class="roles-grid">
					{#each roles as role, i}
						<div class="role-card" class:blue={role.accent === 'blue'} use:reveal>
							<div class="role-top">
								<div class="role-icon-ring" class:blue={role.accent === 'blue'}>{role.icon}</div>
								<h4 class="role-title">{role.title}</h4>
							</div>
							<p class="role-subtitle">{role.subtitle}</p>
							<ul class="role-points">
								{#each role.points as point}
									<li>
										<span class="check">✓</span>
										{point}
									</li>
								{/each}
							</ul>
							<a class="role-cta" href="/app">
								{role.cta}
								<span class="arrow">→</span>
							</a>
							{#if i === 0}
								<div class="card-glow card-glow--blue"></div>
							{:else}
								<div class="card-glow card-glow--gold"></div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- How it works -->
		<section class="section section-alt" id="how-it-works">
			<div class="section-inner">
				<h2 class="section-eyebrow" use:reveal>How it works</h2>
				<h3 class="section-title" use:reveal>From hello to hired in four steps</h3>

				<div class="steps-grid">
					{#each steps as step, i}
						<div class="step-card" use:reveal>
							<div class="step-num">{i + 1}</div>
							<div class="step-icon">{step.icon}</div>
							<h4 class="step-title">{step.title}</h4>
							<p class="step-text">{step.text}</p>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- Features -->
		<section class="section" id="features">
			<div class="section-inner">
				<h2 class="section-eyebrow" use:reveal>Why JobFinder</h2>
				<h3 class="section-title" use:reveal>Built to connect, not to clutter</h3>

				<div class="features-grid">
					{#each features as feature}
						<div class="feature-card" use:reveal>
							<div class="feature-icon">{feature.icon}</div>
							<h4 class="feature-title">{feature.title}</h4>
							<p class="feature-text">{feature.text}</p>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- Testimonials -->
		<section class="section section-alt" id="testimonials">
			<div class="section-inner">
				<h2 class="section-eyebrow" use:reveal>Loved by both sides</h2>
				<h3 class="section-title" use:reveal>Real people, real matches</h3>

				<div class="testimonials-grid">
					{#each testimonials as t}
						<div class="testimonial-card" use:reveal>
							<div class="quote-mark">"</div>
							<p class="quote-text">{t.quote}</p>
							<div class="quote-author">
								<div class="quote-avatar">{t.initials}</div>
								<div class="quote-meta">
									<span class="quote-name">{t.name}</span>
									<span class="quote-role">{t.role}</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- Categories -->
		<section class="section" id="categories">
			<div class="section-inner">
				<h2 class="section-eyebrow" use:reveal>Popular categories</h2>
				<h3 class="section-title" use:reveal>Work you care about, matched instantly</h3>

				<div class="category-grid">
					{#each shownCategories as category}
						<a class="category-chip" href="/app" use:reveal>
							<span class="category-icon">{category.icon}</span>
							<span class="category-name">{category.name}</span>
							<span class="category-arrow">→</span>
						</a>
					{/each}
				</div>
			</div>
		</section>

		<!-- FAQ -->
		<section class="section section-alt" id="faq">
			<div class="section-inner section-inner--narrow">
				<h2 class="section-eyebrow" use:reveal>FAQ</h2>
				<h3 class="section-title" use:reveal>Questions, answered</h3>

				<div class="faq-list">
					{#each faqs as faq, i}
						<div class="faq-item" class:open={openFaq === i} use:reveal>
							<button
								class="faq-question"
								aria-expanded={openFaq === i}
								onclick={() => (openFaq = openFaq === i ? null : i)}
							>
								<span class="faq-q">{faq.q}</span>
								<span class="faq-icon">{openFaq === i ? '−' : '+'}</span>
							</button>
							{#if openFaq === i}
								<div class="faq-answer">
									<p>{faq.a}</p>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- CTA -->
		<section class="cta-band">
			<div class="cta-inner" use:reveal>
				<h3 class="cta-title">Ready to find your match?</h3>
				<p class="cta-text">
					Join JobFinder and start connecting with clients and freelancers who actually fit.
				</p>
				<a class="btn-primary btn-lg" href="/app">
					Get started free
					<span class="btn-arrow">→</span>
				</a>
			</div>
		</section>
	</main>

	<footer class="landing-footer">
		<div class="footer-inner">
			<div class="footer-brand">
				<div class="logo">
					<div class="logo-badge">🔍</div>
					<div class="logo-text-wrap">
						<span class="logo-text">JobFinder</span>
						<span class="logo-tag">match · connect · grow</span>
					</div>
				</div>
				<p class="footer-desc">Real-time matching for clients and freelancers.</p>
			</div>
			<nav class="footer-links">
				<a href="#roles">Who it's for</a>
				<a href="#how-it-works">How it works</a>
				<a href="#categories">Categories</a>
				<a href="#faq">FAQ</a>
			</nav>
			<p class="footer-copy">© {new Date().getFullYear()} JobFinder</p>
		</div>
	</footer>
</div>

<style>
	.landing {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	/* ---------- Reveal animation ---------- */

	:global(.reveal) {
		opacity: 0;
		transform: translateY(22px);
		transition: opacity 0.6s ease, transform 0.6s ease;
	}

	:global(.reveal.visible) {
		opacity: 1;
		transform: translateY(0);
	}

	.roles-grid :global(.reveal:nth-child(2)),
	.steps-grid :global(.reveal:nth-child(2)),
	.testimonials-grid :global(.reveal:nth-child(2)),
	.features-grid :global(.reveal:nth-child(2)) {
		transition-delay: 0.07s;
	}

	.steps-grid :global(.reveal:nth-child(3)),
	.features-grid :global(.reveal:nth-child(3)),
	.testimonials-grid :global(.reveal:nth-child(3)) {
		transition-delay: 0.14s;
	}

	.steps-grid :global(.reveal:nth-child(4)),
	.features-grid :global(.reveal:nth-child(4)) {
		transition-delay: 0.21s;
	}

	.features-grid :global(.reveal:nth-child(5)) {
		transition-delay: 0.28s;
	}

	.features-grid :global(.reveal:nth-child(6)) {
		transition-delay: 0.35s;
	}

	/* ---------- Header ---------- */

	.landing-header {
		position: sticky;
		top: 0;
		z-index: 50;
		background: rgba(6, 10, 23, 0.72);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-bottom: 1px solid var(--border);
	}

	.landing-header::after {
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
		gap: 1.5rem;
		padding: 0.85rem 1.5rem;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
		flex-shrink: 0;
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
		color: var(--text-3);
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 1.75rem;
	}

	.nav-links a {
		color: var(--text-2);
		text-decoration: none;
		font-size: 0.88rem;
		font-weight: 500;
		transition: color 0.2s ease;
	}

	.nav-links a:hover {
		color: var(--text);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.7rem;
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
		max-width: 130px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.admin-link {
		display: inline-flex;
		align-items: center;
		background: rgba(255, 215, 0, 0.08);
		border: 1px solid rgba(255, 215, 0, 0.35);
		color: var(--gold);
		padding: 0.45rem 0.9rem;
		border-radius: 999px;
		font-size: 0.8rem;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.admin-link:hover {
		border-color: rgba(255, 215, 0, 0.6);
		background: rgba(255, 215, 0, 0.14);
	}

	.logout-btn {
		display: inline-flex;
		align-items: center;
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text-2);
		padding: 0.45rem 0.9rem;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.8rem;
		font-weight: 500;
		font-family: var(--font-body);
		transition: all 0.2s ease;
	}

	.logout-btn:hover {
		border-color: rgba(255, 93, 115, 0.5);
		color: var(--danger);
		background: rgba(255, 93, 115, 0.06);
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.85rem 1.6rem;
		border-radius: 999px;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
		font-family: var(--font-display);
		font-size: 1rem;
		font-weight: 700;
		text-decoration: none;
		letter-spacing: 0.3px;
		box-shadow: var(--shadow-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45);
		transition: all 0.25s ease;
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 34px -6px var(--gold-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.btn-arrow {
		transition: transform 0.25s ease;
	}

	.btn-primary:hover .btn-arrow {
		transform: translateX(4px);
	}

	.btn-ghost {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.85rem 1.6rem;
		border-radius: 999px;
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text);
		font-size: 1rem;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.25s ease;
	}

	.btn-ghost:hover {
		border-color: rgba(255, 215, 0, 0.4);
		background: rgba(255, 215, 0, 0.04);
	}

	.btn-sm {
		padding: 0.5rem 1.1rem;
		font-size: 0.85rem;
	}

	/* ---------- Hero ---------- */

	.hero {
		position: relative;
		padding: 5.5rem 1.5rem 5.5rem;
		overflow: hidden;
	}

	.hero::before {
		content: '';
		position: absolute;
		top: -140px;
		left: 50%;
		transform: translateX(-50%);
		width: 860px;
		height: 480px;
		background: radial-gradient(closest-side, rgba(255, 215, 0, 0.11), transparent);
		pointer-events: none;
	}

	.hero::after {
		content: '';
		position: absolute;
		bottom: -120px;
		left: -120px;
		width: 460px;
		height: 460px;
		background: radial-gradient(closest-side, rgba(91, 140, 255, 0.09), transparent);
		pointer-events: none;
	}

	.hero-grid {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(rgba(148, 163, 201, 0.05) 1px, transparent 1px),
			linear-gradient(90deg, rgba(148, 163, 201, 0.05) 1px, transparent 1px);
		background-size: 56px 56px;
		mask-image: radial-gradient(720px 420px at 50% 0%, rgba(0, 0, 0, 0.7), transparent 75%);
		-webkit-mask-image: radial-gradient(720px 420px at 50% 0%, rgba(0, 0, 0, 0.7), transparent 75%);
		pointer-events: none;
	}

	.hero-inner {
		max-width: 820px;
		margin: 0 auto;
		text-align: center;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.hero-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.45rem 1.1rem;
		border-radius: 999px;
		background: rgba(255, 215, 0, 0.08);
		border: 1px solid rgba(255, 215, 0, 0.3);
		color: var(--gold);
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.4px;
		margin-bottom: 1.75rem;
	}

	.pulse-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--success);
		box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.5);
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.5); }
		70% { box-shadow: 0 0 0 8px rgba(52, 211, 153, 0); }
		100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
	}

	.hero-title {
		font-size: 3.6rem;
		font-weight: 700;
		color: var(--text);
		letter-spacing: -0.03em;
		line-height: 1.08;
		margin-bottom: 1.25rem;
	}

	.gradient-text {
		background: linear-gradient(135deg, #ffd700, #ff9d2e);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.hero-subtitle {
		color: var(--text-2);
		font-size: 1.12rem;
		line-height: 1.65;
		max-width: 620px;
		margin-bottom: 2.25rem;
	}

	.hero-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.75rem;
	}

	.trust-row {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		margin-bottom: 3.25rem;
	}

	.trust-item {
		color: var(--text-3);
		font-size: 0.82rem;
		font-weight: 500;
	}

	.trust-dot {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: var(--text-3);
		opacity: 0.6;
	}

	/* Hero chat mockup */

	.hero-visual {
		position: relative;
		width: 100%;
		max-width: 560px;
	}

	.chat-card {
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.94), rgba(10, 15, 30, 0.97));
		border: 1px solid var(--border);
		border-radius: 1.25rem;
		box-shadow: 0 30px 70px -24px rgba(0, 0, 0, 0.75), 0 0 60px -24px var(--gold-glow);
		overflow: hidden;
		text-align: left;
	}

	.chat-head {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border);
		background: rgba(11, 17, 34, 0.55);
	}

	.chat-avatar {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
		flex-shrink: 0;
		background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 157, 46, 0.06));
		border: 1px solid rgba(255, 215, 0, 0.4);
	}

	.chat-meta {
		display: flex;
		flex-direction: column;
		line-height: 1.3;
		flex: 1;
		min-width: 0;
	}

	.chat-name {
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--text);
	}

	.chat-status {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.74rem;
		color: var(--text-3);
	}

	.status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--success);
	}

	.chat-pill {
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--success);
		background: rgba(52, 211, 153, 0.1);
		border: 1px solid rgba(52, 211, 153, 0.35);
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
		white-space: nowrap;
	}

	.chat-body {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.25rem;
	}

	.bubble {
		max-width: 78%;
		padding: 0.7rem 1rem;
		border-radius: 0.95rem;
		font-size: 0.88rem;
		line-height: 1.5;
		color: var(--text);
	}

	.bubble.them {
		align-self: flex-start;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-bottom-left-radius: 0.3rem;
	}

	.bubble.me {
		align-self: flex-end;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
		border-bottom-right-radius: 0.3rem;
		font-weight: 500;
	}

	.typing {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.55rem 0.9rem;
		border-radius: 0.95rem;
		background: var(--surface-2);
		border: 1px solid var(--border);
	}

	.typing-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--text-3);
		animation: typingBounce 1.2s infinite ease-in-out;
	}

	.typing-dot:nth-child(2) {
		animation-delay: 0.15s;
	}

	.typing-dot:nth-child(3) {
		animation-delay: 0.3s;
	}

	@keyframes typingBounce {
		0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
		30% { transform: translateY(-4px); opacity: 1; }
	}

	.typing-label {
		font-size: 0.72rem;
		color: var(--text-3);
		margin-left: 0.25rem;
	}

	.float-badge {
		position: absolute;
		z-index: 2;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.55rem 1rem;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text);
		background: rgba(14, 21, 41, 0.92);
		border: 1px solid var(--border-strong);
		box-shadow: var(--shadow-card);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		animation: float 5s ease-in-out infinite;
	}

	.float-badge--time {
		top: -18px;
		left: -22px;
		color: var(--gold);
	}

	.float-badge--confirm {
		bottom: 26px;
		right: -24px;
		color: var(--success);
		animation-delay: 1.2s;
	}

	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-7px); }
	}

	/* ---------- Sections ---------- */

	.section {
		padding: 4.5rem 1.5rem;
		border-top: 1px solid var(--border);
	}

	.section-alt {
		background: rgba(11, 17, 34, 0.45);
	}

	.section-inner {
		max-width: 1080px;
		margin: 0 auto;
		text-align: center;
	}

	.section-inner--narrow {
		max-width: 720px;
	}

	.section-eyebrow {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: var(--gold);
		margin-bottom: 0.75rem;
	}

	.section-title {
		font-size: 2.2rem;
		font-weight: 700;
		color: var(--text);
		letter-spacing: -0.02em;
		margin-bottom: 3rem;
	}

	/* Roles */

	.roles-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
		max-width: 880px;
		margin: 0 auto;
	}

	.role-card {
		position: relative;
		overflow: hidden;
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.9), rgba(10, 15, 30, 0.95));
		border: 1px solid var(--border);
		border-radius: 1.25rem;
		padding: 2.25rem 2rem 2rem;
		text-align: left;
		transition: all 0.25s ease;
		box-shadow: var(--shadow-card);
	}

	.role-card:hover {
		border-color: rgba(255, 215, 0, 0.4);
		transform: translateY(-4px);
		box-shadow: 0 24px 56px -18px rgba(0, 0, 0, 0.7), 0 0 44px -16px var(--gold-glow);
	}

	.card-glow {
		position: absolute;
		top: -70px;
		left: 50%;
		transform: translateX(-50%);
		width: 260px;
		height: 160px;
		border-radius: 50%;
		pointer-events: none;
		opacity: 0.5;
		transition: opacity 0.3s ease;
	}

	.role-card:hover .card-glow {
		opacity: 1;
	}

	.card-glow--gold {
		background: radial-gradient(closest-side, rgba(255, 215, 0, 0.24), transparent);
	}

	.card-glow--blue {
		background: radial-gradient(closest-side, rgba(91, 140, 255, 0.24), transparent);
	}

	.role-top {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.1rem;
		position: relative;
	}

	.role-icon-ring {
		width: 58px;
		height: 58px;
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.6rem;
		flex-shrink: 0;
		background: linear-gradient(135deg, rgba(255, 215, 0, 0.16), rgba(255, 157, 46, 0.06));
		border: 1px solid rgba(255, 215, 0, 0.35);
	}

	.role-icon-ring.blue {
		background: linear-gradient(135deg, rgba(91, 140, 255, 0.16), rgba(91, 140, 255, 0.05));
		border: 1px solid rgba(91, 140, 255, 0.35);
	}

	.role-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text);
		font-family: var(--font-display);
	}

	.role-subtitle {
		color: var(--text-2);
		font-size: 0.93rem;
		line-height: 1.5;
		margin-bottom: 1.4rem;
		position: relative;
	}

	.role-points {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.75rem;
		position: relative;
	}

	.role-points li {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		color: var(--text-2);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.check {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		margin-top: 1px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.68rem;
		font-weight: 800;
		color: var(--gold);
		background: rgba(255, 215, 0, 0.1);
		border: 1px solid rgba(255, 215, 0, 0.3);
	}

	.role-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--gold);
		text-decoration: none;
		position: relative;
		transition: color 0.2s ease;
	}

	.role-cta:hover {
		color: #ffe95c;
	}

	.arrow {
		transition: transform 0.25s ease;
	}

	.role-cta:hover .arrow {
		transform: translateX(4px);
	}

	/* Steps */

	.steps-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1.25rem;
	}

	.step-card {
		position: relative;
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.85), rgba(10, 15, 30, 0.9));
		border: 1px solid var(--border);
		border-radius: 1.1rem;
		padding: 1.75rem 1.4rem 1.5rem;
		text-align: left;
		transition: all 0.25s ease;
	}

	.step-card:hover {
		border-color: rgba(255, 215, 0, 0.35);
		transform: translateY(-4px);
	}

	.step-num {
		position: absolute;
		top: 1rem;
		right: 1.1rem;
		font-family: var(--font-display);
		font-size: 2.2rem;
		font-weight: 700;
		color: rgba(255, 215, 0, 0.14);
		line-height: 1;
	}

	.step-icon {
		width: 48px;
		height: 48px;
		border-radius: 13px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.3rem;
		background: rgba(255, 215, 0, 0.09);
		border: 1px solid rgba(255, 215, 0, 0.2);
		margin-bottom: 1rem;
	}

	.step-title {
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 0.45rem;
	}

	.step-text {
		font-size: 0.85rem;
		color: var(--text-2);
		line-height: 1.55;
	}

	/* Features */

	.features-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
	}

	.feature-card {
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.85), rgba(10, 15, 30, 0.9));
		border: 1px solid var(--border);
		border-radius: 1.1rem;
		padding: 1.75rem 1.5rem;
		text-align: left;
		transition: all 0.25s ease;
	}

	.feature-card:hover {
		border-color: rgba(255, 215, 0, 0.35);
		transform: translateY(-4px);
		box-shadow: var(--shadow-card);
	}

	.feature-icon {
		font-size: 1.6rem;
		margin-bottom: 0.9rem;
	}

	.feature-title {
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 0.45rem;
	}

	.feature-text {
		font-size: 0.87rem;
		color: var(--text-2);
		line-height: 1.55;
	}

	/* Testimonials */

	.testimonials-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
	}

	.testimonial-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.85), rgba(10, 15, 30, 0.9));
		border: 1px solid var(--border);
		border-radius: 1.1rem;
		padding: 1.75rem 1.5rem;
		text-align: left;
		transition: all 0.25s ease;
	}

	.testimonial-card:hover {
		border-color: rgba(255, 215, 0, 0.35);
		transform: translateY(-4px);
	}

	.quote-mark {
		font-family: var(--font-display);
		font-size: 2.4rem;
		font-weight: 700;
		line-height: 0.6;
		color: var(--gold);
		opacity: 0.7;
	}

	.quote-text {
		font-size: 0.92rem;
		color: var(--text-2);
		line-height: 1.6;
		flex: 1;
	}

	.quote-author {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.quote-avatar {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		font-weight: 700;
		color: #0a0e1a;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		flex-shrink: 0;
	}

	.quote-meta {
		display: flex;
		flex-direction: column;
		line-height: 1.35;
	}

	.quote-name {
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--text);
	}

	.quote-role {
		font-size: 0.75rem;
		color: var(--text-3);
	}

	/* Categories */

	.category-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	.category-chip {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.15rem;
		border-radius: 0.95rem;
		background: rgba(19, 28, 52, 0.7);
		border: 1px solid var(--border);
		text-decoration: none;
		transition: all 0.25s ease;
	}

	.category-chip:hover {
		border-color: rgba(255, 215, 0, 0.4);
		background: rgba(19, 28, 52, 0.95);
		transform: translateY(-2px);
	}

	.category-icon {
		font-size: 1.3rem;
		flex-shrink: 0;
	}

	.category-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text);
		text-align: left;
		flex: 1;
		min-width: 0;
	}

	.category-arrow {
		font-size: 0.85rem;
		color: var(--gold);
		opacity: 0;
		transform: translateX(-4px);
		transition: all 0.25s ease;
		flex-shrink: 0;
	}

	.category-chip:hover .category-arrow {
		opacity: 1;
		transform: translateX(0);
	}

	/* FAQ */

	.faq-list {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		text-align: left;
	}

	.faq-item {
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.85), rgba(10, 15, 30, 0.9));
		border: 1px solid var(--border);
		border-radius: 1rem;
		overflow: hidden;
		transition: border-color 0.25s ease;
	}

	.faq-item.open {
		border-color: rgba(255, 215, 0, 0.35);
	}

	.faq-question {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.15rem 1.4rem;
		background: transparent;
		border: none;
		cursor: pointer;
		color: var(--text);
		font-family: var(--font-body);
		font-size: 0.98rem;
		font-weight: 600;
		text-align: left;
	}

	.faq-q {
		flex: 1;
	}

	.faq-icon {
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		font-weight: 700;
		color: var(--gold);
		background: rgba(255, 215, 0, 0.1);
		border: 1px solid rgba(255, 215, 0, 0.3);
		transition: transform 0.25s ease, background 0.25s ease;
	}

	.faq-item.open .faq-icon {
		transform: rotate(90deg);
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
		border-color: transparent;
	}

	.faq-answer {
		padding: 0 1.4rem 1.25rem;
		animation: faqIn 0.25s ease;
	}

	.faq-answer p {
		color: var(--text-2);
		font-size: 0.9rem;
		line-height: 1.65;
		border-top: 1px solid var(--border);
		padding-top: 1rem;
	}

	@keyframes faqIn {
		from { opacity: 0; transform: translateY(-6px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* CTA band */

	.cta-band {
		border-top: 1px solid var(--border);
		padding: 4.5rem 1.5rem;
		position: relative;
		overflow: hidden;
	}

	.cta-band::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(700px 300px at 50% 0%, rgba(255, 215, 0, 0.09), transparent);
		pointer-events: none;
	}

	.cta-inner {
		max-width: 640px;
		margin: 0 auto;
		text-align: center;
		position: relative;
	}

	.cta-title {
		font-size: 2.1rem;
		font-weight: 700;
		color: var(--text);
		letter-spacing: -0.02em;
		margin-bottom: 0.75rem;
	}

	.cta-text {
		color: var(--text-2);
		font-size: 1.02rem;
		line-height: 1.6;
		margin-bottom: 2rem;
	}

	.btn-lg {
		padding: 1rem 2.2rem;
		font-size: 1.05rem;
	}

	/* ---------- Footer ---------- */

	.landing-footer {
		border-top: 1px solid var(--border);
		background: rgba(11, 17, 34, 0.5);
		padding: 2.5rem 1.5rem 2rem;
	}

	.footer-inner {
		max-width: 1080px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		flex-wrap: wrap;
	}

	.footer-brand {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.footer-desc {
		color: var(--text-3);
		font-size: 0.82rem;
	}

	.footer-links {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.footer-links a {
		color: var(--text-2);
		text-decoration: none;
		font-size: 0.85rem;
		font-weight: 500;
		transition: color 0.2s ease;
	}

	.footer-links a:hover {
		color: var(--gold);
	}

	.footer-copy {
		color: var(--text-3);
		font-size: 0.78rem;
	}

	/* ---------- Responsive ---------- */

	@media (max-width: 960px) {
		.nav-links {
			display: none;
		}

		.steps-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.features-grid,
		.testimonials-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.category-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.roles-grid {
			grid-template-columns: 1fr;
			max-width: 560px;
		}
	}

	@media (max-width: 600px) {
		.hero {
			padding: 3.5rem 1rem 3.5rem;
		}

		.hero-title {
			font-size: 2.4rem;
		}

		.hero-subtitle {
			font-size: 1rem;
		}

		.hero-actions {
			flex-direction: column;
			width: 100%;
		}

		.hero-actions .btn-primary,
		.hero-actions .btn-ghost {
			width: 100%;
		}

		.trust-row {
			flex-wrap: wrap;
			justify-content: center;
		}

		.float-badge {
			display: none;
		}

		.steps-grid,
		.features-grid,
		.testimonials-grid,
		.category-grid {
			grid-template-columns: 1fr;
		}

		.section-title {
			font-size: 1.7rem;
		}

		.header-right .btn-ghost {
			display: none;
		}

		.footer-inner {
			flex-direction: column;
			align-items: flex-start;
			gap: 1.25rem;
		}
	}
</style>
