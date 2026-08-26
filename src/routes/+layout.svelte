<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/assets/animations.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(:root) {
		--bg: #060a17;
		--bg-elevated: #0b1122;
		--surface: #0e1529;
		--surface-2: #121b33;
		--border: rgba(148, 163, 201, 0.14);
		--border-strong: rgba(148, 163, 201, 0.28);
		--text: #e8edf9;
		--text-2: #a3aecd;
		--text-3: #7c8ab0;
		--gold: #ffd700;
		--gold-2: #ffb800;
		--gold-glow: rgba(255, 215, 0, 0.35);
		--blue: #5b8cff;
		--danger: #ff5d73;
		--success: #34d399;
		--radius: 1rem;
		--radius-sm: 0.65rem;
		--font-display: 'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		--font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		--shadow-card: 0 10px 40px -12px rgba(0, 0, 0, 0.55);
		--shadow-glow: 0 6px 28px -6px var(--gold-glow);
	}

	:global(body) {
		font-family: var(--font-body);
		background:
			radial-gradient(1100px 700px at 85% -10%, rgba(255, 215, 0, 0.06), transparent 60%),
			radial-gradient(900px 650px at -10% 110%, rgba(91, 140, 255, 0.07), transparent 55%),
			radial-gradient(700px 500px at 50% 120%, rgba(255, 184, 0, 0.04), transparent 60%),
			var(--bg);
		color: var(--text);
		min-height: 100vh;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global(h1, h2, h3, h4) {
		font-family: var(--font-display);
	}

	:global(#app) {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	:global(button) {
		font-family: var(--font-body);
	}

	::selection {
		background: rgba(255, 215, 0, 0.35);
		color: #fff;
	}

	:global(::-webkit-scrollbar) {
		width: 10px;
		height: 10px;
	}

	:global(::-webkit-scrollbar-track) {
		background: transparent;
	}

	:global(::-webkit-scrollbar-thumb) {
		background: linear-gradient(180deg, #1c2747, #16203c);
		border-radius: 8px;
		border: 2px solid var(--bg);
	}

	:global(::-webkit-scrollbar-thumb:hover) {
		background: #24335c;
	}

	@media (prefers-reduced-motion: reduce) {
		:global(*),
		:global(*::before),
		:global(*::after) {
			animation-duration: 0.001s !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.001s !important;
		}
	}


</style>
