<script lang="ts">
	import { createClient } from '$lib/supabase';
	import { queue } from '$lib/stores/queue.svelte';
	import { invalidateAll } from '$app/navigation';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let rememberMe = $state(false);
	let error = $state('');
	let loading = $state(false);


	async function handleSignup() {
		error = '';
		if (!name.trim()) { error = 'Name is required'; return; }
		if (!email.trim()) { error = 'Email is required'; return; }
		if (!password) { error = 'Password is required'; return; }
		if (password.length < 6) { error = 'Password must be at least 6 characters'; return; }
		if (password !== confirmPassword) { error = 'Passwords do not match'; return; }

		/*
		 * Create the client with the correct storage strategy.
		 * If the user checked "remember me" we persist in localStorage,
		 * otherwise the session lives in sessionStorage and is lost
		 * when the tab is closed.
		 */
		const supabase = createClient(rememberMe);
		if (rememberMe) {
			localStorage.setItem('remember_me', 'true');
		} else {
			localStorage.removeItem('remember_me');
		}

		loading = true;
		const { data, error: authError } = await supabase.auth.signUp({
			email: email.trim(),
			password,
			options: { data: { name: name.trim() } }
		});
		loading = false;

		if (authError) {
			error = authError.message;
			return;
		}

		if (data.user) {
			queue.user = {
				id: data.user.id,
				name: name.trim(),
				email: data.user.email!
			};
			await invalidateAll();
			queue.step = 'role';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleSignup();
	}
</script>

<div class="auth-wrap">
	<div class="auth-card">
		<div class="auth-glow"></div>
		<div class="auth-header">
			<div class="auth-icon-ring">
				<div class="auth-icon">🚀</div>
			</div>
			<h2 class="auth-title">Create Account</h2>
			<p class="auth-subtitle">Join JobFinder and start matching today</p>
		</div>

		<form class="auth-form" onsubmit={(e) => { e.preventDefault(); handleSignup(); }}>
			{#if error}
				<div class="auth-error">
					<span class="error-dot">!</span>
					{error}
				</div>
			{/if}

			<div class="field">
				<label for="name">Full Name</label>
				<div class="input-wrap">
					<span class="input-icon">👤</span>
					<input
						id="name"
						type="text"
						placeholder="John Doe"
						bind:value={name}
						onkeydown={handleKeydown}
						disabled={loading}
						autocomplete="name"
					/>
				</div>
			</div>

			<div class="field">
				<label for="email">Email</label>
				<div class="input-wrap">
					<span class="input-icon">✉️</span>
					<input
						id="email"
						type="email"
						placeholder="you@example.com"
						bind:value={email}
						onkeydown={handleKeydown}
						disabled={loading}
						autocomplete="email"
					/>
				</div>
			</div>

			<div class="field-row">
				<div class="field">
					<label for="password">Password</label>
					<div class="input-wrap">
						<span class="input-icon">🔑</span>
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							placeholder="••••••••"
							bind:value={password}
							onkeydown={handleKeydown}
							disabled={loading}
							autocomplete="new-password"
						/>
					</div>
				</div>
				<div class="field">
					<label for="confirm-password">Confirm</label>
					<div class="input-wrap">
						<span class="input-icon">✓</span>
						<input
							id="confirm-password"
							type={showPassword ? 'text' : 'password'}
							placeholder="••••••••"
							bind:value={confirmPassword}
							onkeydown={handleKeydown}
							disabled={loading}
							autocomplete="new-password"
						/>
					</div>
				</div>
			</div>

			<button type="button" class="show-pass" onclick={() => (showPassword = !showPassword)}>
				{showPassword ? '🙈 Hide passwords' : '👁️ Show passwords'}
			</button>				<div class="remember-row">
					<label class="remember-label">
						<input type="checkbox" bind:checked={rememberMe} class="remember-checkbox" />
						<span class="remember-text">Remember me</span>
					</label>
				</div>

				<button type="submit" class="auth-btn" disabled={loading}>
					{#if loading}
						<span class="btn-spinner"></span>
						Creating account…
					{:else}
						Create Account
					{/if}
				</button>
		</form>

		<p class="auth-switch">
			Already have an account?
			<button class="link-btn" onclick={() => queue.goToLogin()}>Sign In</button>
		</p>
	</div>
</div>

<style>
	.auth-wrap {
		width: 100%;
		max-width: 460px;
		animation: fadeIn 0.4s ease;
	}

	.auth-card {
		position: relative;
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.92), rgba(10, 15, 30, 0.96));
		border: 1px solid var(--border);
		border-radius: 1.25rem;
		padding: 2.75rem 2.25rem;
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}

	.auth-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 60%;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.6), transparent);
	}

	.auth-glow {
		position: absolute;
		top: -80px;
		left: 50%;
		transform: translateX(-50%);
		width: 280px;
		height: 170px;
		background: radial-gradient(closest-side, rgba(255, 215, 0, 0.14), transparent);
		pointer-events: none;
	}

	.auth-header {
		text-align: center;
		margin-bottom: 2rem;
		position: relative;
	}

	.auth-icon-ring {
		width: 64px;
		height: 64px;
		margin: 0 auto 1rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, rgba(255, 215, 0, 0.18), rgba(255, 157, 46, 0.08));
		border: 1px solid rgba(255, 215, 0, 0.35);
		box-shadow: 0 0 30px -6px var(--gold-glow), inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}

	.auth-icon {
		font-size: 1.7rem;
	}

	.auth-title {
		font-size: 1.8rem;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 0.4rem;
		letter-spacing: -0.02em;
	}

	.auth-subtitle {
		color: var(--text-2);
		font-size: 0.93rem;
	}

	.auth-error {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		background: rgba(255, 93, 115, 0.08);
		border: 1px solid rgba(255, 93, 115, 0.28);
		color: #ff8fa3;
		padding: 0.7rem 1rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		margin-bottom: 1.25rem;
		animation: shake 0.35s ease;
	}

	.error-dot {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
		border-radius: 50%;
		background: rgba(255, 93, 115, 0.2);
		border: 1px solid rgba(255, 93, 115, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		font-weight: 700;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 1.05rem;
		position: relative;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.85rem;
	}

	.field label {
		color: var(--text-2);
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.3px;
	}

	.input-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.input-icon {
		position: absolute;
		left: 0.85rem;
		font-size: 0.95rem;
		opacity: 0.7;
		pointer-events: none;
	}

	.input-wrap input {
		width: 100%;
		background: rgba(6, 10, 23, 0.7);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0.8rem 1rem 0.8rem 2.6rem;
		color: var(--text);
		font-size: 0.95rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.input-wrap input:focus {
		border-color: var(--gold);
		box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.14);
	}

	.input-wrap input::placeholder {
		color: var(--text-3);
	}

	.input-wrap input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.show-pass {
		align-self: flex-start;
		background: none;
		border: none;
		color: var(--text-3);
		font-size: 0.78rem;
		cursor: pointer;
		font-family: inherit;
		transition: color 0.2s ease;
		margin-top: -0.2rem;
	}

	.show-pass:hover {
		color: var(--text-2);
	}

	.remember-row {
		display: flex;
		align-items: center;
	}

	.remember-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.remember-checkbox {
		width: 16px;
		height: 16px;
		accent-color: var(--gold);
		cursor: pointer;
	}

	.remember-text {
		color: var(--text-2);
		font-size: 0.85rem;
	}

	.auth-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		padding: 0.9rem;
		font-size: 1rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: #0a0e1a;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all 0.25s ease;
		letter-spacing: 0.5px;
		box-shadow: var(--shadow-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45);
		margin-top: 0.5rem;
	}

	.auth-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 10px 34px -6px var(--gold-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.auth-btn:active:not(:disabled) {
		transform: translateY(0) scale(0.99);
	}

	.auth-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		box-shadow: none;
	}

	.btn-spinner {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 2px solid rgba(10, 14, 26, 0.3);
		border-top-color: #0a0e1a;
		animation: spin 0.7s linear infinite;
	}

	.auth-switch {
		text-align: center;
		color: var(--text-2);
		font-size: 0.9rem;
		margin-top: 1.6rem;
	}

	.link-btn {
		background: none;
		border: none;
		color: var(--gold);
		font-weight: 600;
		cursor: pointer;
		font-size: 0.9rem;
		font-family: inherit;
		transition: color 0.2s ease;
		margin-left: 0.2rem;
	}

	.link-btn:hover {
		color: #ffe95c;
		text-decoration: underline;
	}
</style>
