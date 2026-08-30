<script lang="ts">
	import { queue } from '$lib/stores/queue.svelte';
	import { iconChoices } from '$lib/utils';
	import StepProgress from '$lib/components/StepProgress.svelte';

	let showCreateForm = $state(false);
	let newName = $state('');
	let newIcon = $state('📁');
	let newDescription = $state('');
	let creating = $state(false);
	let error = $state('');
	let notice = $state('');

	function openForm() {
		error = '';
		showCreateForm = true;
	}

	function closeForm() {
		showCreateForm = false;
		newName = '';
		newIcon = '📁';
		newDescription = '';
		error = '';
	}

	async function createCategory() {
		if (!newName.trim()) {
			error = 'Please enter a category name.';
			return;
		}

		creating = true;
		error = '';

		try {
			await queue.createCategory({
				name: newName.trim(),
				icon: newIcon,
				description: newDescription.trim() || `Work related to ${newName.trim()}`
			});
			notice = '✓ Category submitted for approval — an admin will review it shortly.';
			closeForm();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
		} finally {
			creating = false;
		}
	}
</script>

<div class="category-selector">
	<StepProgress active={2} />

	<h2 class="title">
		{queue.role === 'client' ? 'What do you need done?' : 'What can you do?'}
	</h2>
	<p class="subtitle">Select one or more categories, or request a new one (pending admin approval)</p>

	<div class="category-grid">
		{#each queue.categories as category}
			<button
				class="category-card"
				class:selected={queue.selectedCategoryIds.includes(category.id)}
				onclick={() => queue.toggleCategory(category.id)}
			>
				<span class="check-badge" class:visible={queue.selectedCategoryIds.includes(category.id)}>
					✓
				</span>
				<span class="category-icon">{category.icon}</span>
				<span class="category-name">{category.name}</span>
				<span class="category-desc">{category.description}</span>
			</button>
		{/each}

		<button
			class="category-card create-card"
			class:selected={showCreateForm}
			onclick={() => (showCreateForm ? closeForm() : openForm())}
		>
			<span class="category-icon create-icon">＋</span>
			<span class="category-name">Request New</span>
			<span class="category-desc">Submit a category for admin approval</span>
		</button>
	</div>

	{#if notice}
			<div class="notice-banner">
				<span>{notice}</span>
				<button class="notice-close" onclick={() => (notice = '')}>✕</button>
			</div>
		{/if}

	{#if showCreateForm}
		<form class="create-form" onsubmit={(e) => { e.preventDefault(); createCategory(); }}>
			<h3 class="form-title">✦ New Category</h3>

			<label class="field">
				<span class="field-label">Name *</span>
				<input
					type="text"
					placeholder="e.g. AI & Machine Learning"
					bind:value={newName}
					maxlength="60"
				/>
			</label>

			<label class="field">
				<span class="field-label">Icon</span>
				<div class="icon-picker">
					{#each iconChoices as icon}
						<button
							type="button"
							class="icon-option"
							class:selected={newIcon === icon}
							onclick={() => (newIcon = icon)}
						>
							{icon}
						</button>
					{/each}
					<input
						type="text"
						class="icon-input"
						bind:value={newIcon}
						placeholder="or type an emoji"
						maxlength="4"
					/>
				</div>
			</label>

			<label class="field">
				<span class="field-label">Description</span>
				<input
					type="text"
					placeholder="Short description of this category"
					bind:value={newDescription}
					maxlength="120"
				/>
			</label>

			{#if error}
				<p class="form-error">⚠ {error}</p>
			{/if}

			<div class="form-actions">
				<button type="button" class="cancel-btn" onclick={closeForm}>Cancel</button>
				<button type="submit" class="create-btn" disabled={creating}>
					{creating ? 'Submitting…' : 'Submit for Approval'}
				</button>
			</div>
		</form>
	{/if}

	<button
		class="find-btn"
		disabled={queue.selectedCategoryIds.length === 0}
		onclick={() => queue.startSearch()}
	>
		{queue.role === 'client' ? 'Find Freelancers' : 'Find Work'}
		<span class="find-arrow">→</span>
	</button>
</div>

<style>
	.category-selector {
		width: 100%;
		animation: fadeIn 0.4s ease;
	}

	.title {
		font-size: 1.9rem;
		font-weight: 700;
		color: var(--text);
		text-align: center;
		margin-bottom: 0.5rem;
		letter-spacing: -0.02em;
	}

	.subtitle {
		color: var(--text-2);
		text-align: center;
		font-size: 0.98rem;
		margin-bottom: 2rem;
	}

	.category-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: 1rem;
		margin-bottom: 2.25rem;
		max-width: 700px;
		margin-left: auto;
		margin-right: auto;
	}

	.category-card {
		position: relative;
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.9), rgba(10, 15, 30, 0.95));
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 1.4rem 1rem 1.2rem;
		cursor: pointer;
		transition: all 0.25s ease;
		text-align: center;
		color: var(--text);
		font-family: inherit;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		min-height: 150px;
		box-shadow: var(--shadow-card);
	}

	.category-card:hover {
		border-color: rgba(255, 215, 0, 0.4);
		transform: translateY(-3px);
		box-shadow: 0 16px 40px -16px rgba(0, 0, 0, 0.6), 0 0 30px -12px var(--gold-glow);
	}

	.category-card.selected {
		border-color: var(--gold);
		background: linear-gradient(160deg, rgba(34, 42, 72, 0.95), rgba(16, 22, 44, 0.98));
		box-shadow: 0 0 0 1px rgba(255, 215, 0, 0.25), 0 0 34px -10px var(--gold-glow);
	}

	.check-badge {
		position: absolute;
		top: 0.6rem;
		right: 0.6rem;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
		font-size: 0.7rem;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transform: scale(0.5);
		transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
		box-shadow: 0 2px 10px rgba(255, 215, 0, 0.4);
	}

	.check-badge.visible {
		opacity: 1;
		transform: scale(1);
	}

	.category-icon {
		font-size: 1.9rem;
		width: 52px;
		height: 52px;
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 215, 0, 0.07);
		border: 1px solid rgba(255, 215, 0, 0.14);
		transition: transform 0.25s ease, background 0.25s ease;
	}

	.category-card:hover .category-icon {
		transform: scale(1.1) rotate(-4deg);
	}

	.category-card.selected .category-icon {
		background: rgba(255, 215, 0, 0.16);
		border-color: rgba(255, 215, 0, 0.4);
	}

	.create-card {
		border-style: dashed;
		background: rgba(10, 15, 30, 0.4);
		border-color: var(--border-strong);
		box-shadow: none;
	}

	.create-card:hover {
		border-color: var(--gold);
		background: rgba(255, 215, 0, 0.04);
		box-shadow: 0 0 26px -12px var(--gold-glow);
	}

	.create-icon {
		background: transparent;
		border: none;
		font-size: 1.8rem;
		color: var(--text-3);
		transition: transform 0.3s ease, color 0.3s ease;
	}

	.create-card:hover .create-icon {
		transform: scale(1.15) rotate(90deg);
		color: var(--gold);
	}

	.category-name {
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--text);
	}

	.category-desc {
		font-size: 0.72rem;
		color: var(--text-3);
		line-height: 1.35;
	}

	.create-form {
		background: linear-gradient(160deg, rgba(19, 28, 52, 0.95), rgba(10, 15, 30, 0.98));
		border: 1px solid rgba(255, 215, 0, 0.3);
		border-radius: 1.1rem;
		padding: 1.75rem;
		margin-bottom: 2rem;
		max-width: 500px;
		margin-left: auto;
		margin-right: auto;
		box-shadow: 0 20px 60px -20px rgba(0, 0, 0, 0.7);
		animation: formIn 0.3s ease;
	}

	.form-title {
		color: var(--gold);
		font-size: 1.1rem;
		font-weight: 700;
		font-family: var(--font-display);
		margin-bottom: 1.25rem;
	}

	.field {
		display: block;
		margin-bottom: 1rem;
	}

	.field-label {
		display: block;
		color: var(--text-2);
		font-size: 0.78rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 0.4rem;
	}

	.field input[type='text'] {
		width: 100%;
		box-sizing: border-box;
		background: rgba(6, 10, 23, 0.7);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0.7rem 0.9rem;
		color: var(--text);
		font-size: 0.92rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.field input[type='text']:focus {
		border-color: var(--gold);
		box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.14);
	}

	.field input[type='text']::placeholder {
		color: var(--text-3);
	}

	.icon-picker {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}

	.icon-option {
		background: rgba(6, 10, 23, 0.7);
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		padding: 0.4rem 0.55rem;
		font-size: 1.1rem;
		cursor: pointer;
		transition: all 0.2s ease;
		line-height: 1;
	}

	.icon-option:hover {
		border-color: rgba(255, 215, 0, 0.5);
		transform: scale(1.12);
	}

	.icon-option.selected {
		border-color: var(--gold);
		background: rgba(255, 215, 0, 0.12);
		box-shadow: 0 0 12px rgba(255, 215, 0, 0.2);
	}

	.icon-input {
		width: 130px !important;
		flex: 1;
		min-width: 120px;
	}

	.form-error {
		color: #ff8fa3;
		font-size: 0.85rem;
		margin-bottom: 1rem;
		background: rgba(255, 93, 115, 0.08);
		border: 1px solid rgba(255, 93, 115, 0.28);
		padding: 0.6rem 0.9rem;
		border-radius: var(--radius-sm);
	}

	.notice-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		max-width: 500px;
		margin: 0 auto 1.5rem;
		background: rgba(52, 211, 153, 0.08);
		border: 1px solid rgba(52, 211, 153, 0.3);
		color: #7ee2b8;
		font-size: 0.88rem;
		padding: 0.7rem 1rem;
		border-radius: var(--radius-sm);
		animation: formIn 0.3s ease;
	}

	.notice-close {
		background: transparent;
		border: none;
		color: inherit;
		font-size: 0.85rem;
		cursor: pointer;
		padding: 0;
		opacity: 0.7;
	}

	.notice-close:hover {
		opacity: 1;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 0.25rem;
	}

	.cancel-btn {
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text-2);
		padding: 0.6rem 1.4rem;
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 0.9rem;
		font-family: inherit;
		transition: all 0.2s ease;
	}

	.cancel-btn:hover {
		border-color: rgba(255, 93, 115, 0.5);
		color: var(--danger);
		background: rgba(255, 93, 115, 0.06);
	}

	.create-btn {
		background: linear-gradient(135deg, #ffd700, #ffb800);
		border: none;
		color: #0a0e1a;
		padding: 0.6rem 1.6rem;
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 700;
		font-family: var(--font-display);
		transition: all 0.2s ease;
		box-shadow: var(--shadow-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.create-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 8px 26px -6px var(--gold-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.create-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.find-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin: 0 auto;
		padding: 0.95rem 2.4rem;
		font-size: 1.05rem;
		font-weight: 700;
		font-family: var(--font-display);
		color: #0a0e1a;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		border: none;
		border-radius: 0.65rem;
		cursor: pointer;
		transition: all 0.25s ease;
		letter-spacing: 0.5px;
		box-shadow: var(--shadow-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.find-arrow {
		transition: transform 0.25s ease;
	}

	.find-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 10px 34px -6px var(--gold-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.find-btn:hover:not(:disabled) .find-arrow {
		transform: translateX(4px);
	}

	.find-btn:active:not(:disabled) {
		transform: translateY(0) scale(0.99);
	}

	.find-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
		box-shadow: none;
	}

	@keyframes formIn {
		from { opacity: 0; transform: translateY(8px) scale(0.98); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}
</style>
