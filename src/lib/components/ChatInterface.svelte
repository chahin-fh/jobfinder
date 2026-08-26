<script lang="ts">
	import { queue } from '$lib/stores/queue.svelte';
	import { tick } from 'svelte';

	let inputText = $state('');
	let confirming = $state(false);
	let messagesEl: HTMLDivElement | null = $state(null);

	function handleSend() {
		if (!inputText.trim()) return;
		queue.sendMessage(inputText);
		inputText = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function formatTime(date: Date) {
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	async function confirmJob() {
		if (!queue.matchResult || confirming) return;
		confirming = true;
		try {
			const res = await fetch(`/api/matches/${queue.matchResult.chatId}/confirm`, {
				method: 'POST'
			});
			if (res.ok) {
				queue.sendMessage('✓ Job confirmed! Let\'s get started.');
			} else {
				queue.sendMessage('✓ Job confirmed!');
			}
		} catch {
			queue.sendMessage('✓ Job confirmed!');
		} finally {
			confirming = false;
		}
	}

	$effect(() => {
		// react to message list changes then scroll
		void queue.messages.length;
		tick().then(() => {
			if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
		});
	});
</script>

<div class="chat-interface">
	<div class="chat-header">
		<button class="back-btn" onclick={() => queue.reset()}>
			<span class="back-arrow">←</span>
			Leave
		</button>

		<div class="header-info">
			<div class="header-avatar-wrap">
				<div class="header-avatar">
					{queue.matchResult?.matchedName.charAt(0).toUpperCase()}
				</div>
				<span class="online-dot"></span>
			</div>
			<div class="header-text">
				<h3 class="header-name">{queue.matchResult?.matchedName}</h3>
				<span class="header-category">
					{queue.matchResult?.category.icon} {queue.matchResult?.category.name}
				</span>
			</div>
		</div>

		<button
			class="confirm-btn"
			disabled={confirming}
			onclick={confirmJob}
		>
			{confirming ? 'Confirming…' : '✓ Confirm Job'}
		</button>
	</div>

	<div class="messages-container" bind:this={messagesEl}>
		{#each queue.messages as message (message.id)}
			<div
				class="message"
				class:message--sent={message.sender === 'me'}
				class:message--received={message.sender === 'them'}
			>
				<div class="message-bubble">
					<p class="message-text">{message.text}</p>
					<span class="message-time">{formatTime(message.timestamp)}</span>
				</div>
			</div>
		{/each}
	</div>

	<div class="chat-input">
		<div class="input-wrap">
			<input
				type="text"
				placeholder="Type a message…"
				bind:value={inputText}
				onkeydown={handleKeydown}
				aria-label="Message"
			/>
		</div>
		<button class="send-btn" disabled={!inputText.trim()} onclick={handleSend} aria-label="Send message">
			<span class="send-icon">➤</span>
		</button>
	</div>
</div>

<style>
	.chat-interface {
		display: flex;
		flex-direction: column;
		height: min(70vh, 620px);
		width: 100%;
		max-width: 620px;
		margin: 0 auto;
		background: linear-gradient(160deg, rgba(14, 21, 41, 0.96), rgba(7, 11, 24, 0.98));
		border: 1px solid var(--border);
		border-radius: 1.25rem;
		overflow: hidden;
		box-shadow: var(--shadow-card);
		animation: fadeIn 0.4s ease;
	}

	.chat-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.8rem 1rem;
		border-bottom: 1px solid var(--border);
		background: rgba(19, 28, 52, 0.7);
		backdrop-filter: blur(10px);
		position: relative;
	}

	.chat-header::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.25), transparent);
	}

	.back-btn {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text-2);
		padding: 0.4rem 0.8rem;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.8rem;
		font-family: inherit;
		transition: all 0.2s ease;
	}

	.back-arrow {
		transition: transform 0.25s ease;
	}

	.back-btn:hover {
		border-color: rgba(255, 93, 115, 0.5);
		color: var(--danger);
		background: rgba(255, 93, 115, 0.06);
	}

	.back-btn:hover .back-arrow {
		transform: translateX(-3px);
	}

	.header-info {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		min-width: 0;
	}

	.header-avatar-wrap {
		position: relative;
		flex-shrink: 0;
	}

	.header-avatar {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		font-weight: 700;
		font-family: var(--font-display);
		box-shadow: 0 0 16px -4px var(--gold-glow);
	}

	.online-dot {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--success);
		border: 2px solid #0d1428;
		box-shadow: 0 0 8px rgba(52, 211, 153, 0.7);
	}

	.header-text {
		min-width: 0;
	}

	.header-name {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text);
		font-family: var(--font-display);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.header-category {
		font-size: 0.72rem;
		color: var(--text-3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: block;
	}

	.confirm-btn {
		flex-shrink: 0;
		background: linear-gradient(135deg, #34d399, #10b981);
		border: none;
		color: #04110c;
		padding: 0.45rem 0.9rem;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.78rem;
		font-weight: 700;
		font-family: var(--font-display);
		transition: all 0.2s ease;
		box-shadow: 0 4px 18px -6px rgba(52, 211, 153, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.35);
	}

	.confirm-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 24px -6px rgba(52, 211, 153, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.35);
	}

	.messages-container {
		flex: 1;
		overflow-y: auto;
		padding: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.messages-container::-webkit-scrollbar {
		width: 5px;
	}

	.messages-container::-webkit-scrollbar-track {
		background: transparent;
	}

	.messages-container::-webkit-scrollbar-thumb {
		background: #1c2747;
		border-radius: 4px;
	}

	.message {
		display: flex;
		animation: messageIn 0.25s ease both;
	}

	.message--sent {
		justify-content: flex-end;
	}

	.message--received {
		justify-content: flex-start;
	}

	.message-bubble {
		max-width: 72%;
		padding: 0.6rem 0.9rem 0.45rem;
		border-radius: 1.05rem;
		position: relative;
		box-shadow: 0 4px 16px -8px rgba(0, 0, 0, 0.5);
	}

	.message--sent .message-bubble {
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
		border-bottom-right-radius: 0.3rem;
	}

	.message--received .message-bubble {
		background: #1a2545;
		color: var(--text);
		border: 1px solid var(--border);
		border-bottom-left-radius: 0.3rem;
	}

	.message-text {
		font-size: 0.9rem;
		line-height: 1.45;
		margin-bottom: 0.2rem;
		overflow-wrap: break-word;
	}

	.message-time {
		font-size: 0.62rem;
		opacity: 0.65;
		display: block;
		text-align: right;
	}

	.chat-input {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.8rem 1rem;
		border-top: 1px solid var(--border);
		background: rgba(19, 28, 52, 0.7);
		backdrop-filter: blur(10px);
	}

	.input-wrap {
		flex: 1;
	}

	.input-wrap input {
		width: 100%;
		background: rgba(6, 10, 23, 0.75);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.7rem 1.1rem;
		color: var(--text);
		font-size: 0.9rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.input-wrap input:focus {
		border-color: var(--gold);
		box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.12);
	}

	.input-wrap input::placeholder {
		color: var(--text-3);
	}

	.send-btn {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		flex-shrink: 0;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		border: none;
		color: #0a0e1a;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: var(--shadow-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.send-icon {
		font-size: 1rem;
		transform: rotate(-45deg);
		display: block;
		margin-left: 2px;
		transition: transform 0.2s ease;
	}

	.send-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 24px -4px var(--gold-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.send-btn:hover:not(:disabled) .send-icon {
		transform: rotate(-45deg) translateX(2px);
	}

	.send-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
		box-shadow: none;
	}

	@keyframes messageIn {
		from { opacity: 0; transform: translateY(6px) scale(0.97); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}
</style>
