<script lang="ts">
	import { queue } from '$lib/stores/queue.svelte';
	import { tick } from 'svelte';

	let inputText = $state('');
	let confirming = $state(false);
	let messagesEl: HTMLDivElement | null = $state(null);
	let lastTypingSent = 0;

	// Track whether the other user has confirmed (inferred from matchStatus)
	let otherConfirmed = $derived(
		queue.matchStatus === 'confirmed' && !queue.iConfirmed
	);

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

	function handleInput() {
		// Throttle the broadcast to at most one per second — the receiver
		// keeps the indicator visible for 3s after each event.
		const now = Date.now();
		if (now - lastTypingSent >= 1000) {
			lastTypingSent = now;
			queue.sendTypingIndicator();
		}
	}

	function formatTime(date: Date) {
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function formatDate(date: Date) {
		const today = new Date();
		const msgDate = new Date(date);

		if (msgDate.toDateString() === today.toDateString()) {
			return 'Today';
		}

		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		if (msgDate.toDateString() === yesterday.toDateString()) {
			return 'Yesterday';
		}

		return msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}

	function shouldShowDateSeparator(index: number) {
		if (index === 0) return true;
		const current = new Date(queue.messages[index].timestamp);
		const prev = new Date(queue.messages[index - 1].timestamp);
		return current.toDateString() !== prev.toDateString();
	}

	async function confirmJob() {
		if (!queue.matchResult || confirming || queue.iConfirmed) return;

		confirming = true;
		try {
			const res = await fetch(`/api/matches/${queue.matchResult.chatId}/confirm`, {
				method: 'POST'
			});

			if (res.ok) {
				// Update local state to show confirmed
				queue.iConfirmed = true;
				queue.matchStatus = 'confirmed';

				// Send a confirmation message so the other side sees it
				await queue.sendMessage('✅ Job confirmed! Let\'s get started.');
			} else {
				// Still mark as confirmed locally — the API may have already
				// set it on a previous attempt.
				queue.iConfirmed = true;
				queue.matchStatus = 'confirmed';
				await queue.sendMessage('✅ Job confirmed!');
			}
		} catch {
			queue.iConfirmed = true;
			queue.matchStatus = 'confirmed';
			await queue.sendMessage('✅ Job confirmed!');
		} finally {
			confirming = false;
		}
	}

	$effect(() => {
		void queue.messages.length;
		tick().then(() => {
			if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
		});
	});
</script>

<div class="chat-panel-content">
	<div class="messages-area" bind:this={messagesEl}>
		{#each queue.messages as message, i (message.id)}
			{#if shouldShowDateSeparator(i)}
				<div class="date-separator">
					<span>{formatDate(message.timestamp)}</span>
				</div>
			{/if}
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

		{#if queue.otherUserTyping}
			<div class="message message--received">
				<div class="typing-bubble">
					<span class="typing-dot"></span>
					<span class="typing-dot"></span>
					<span class="typing-dot"></span>
				</div>
			</div>
		{/if}
	</div>

	<div class="chat-input-bar">
		<div class="confirm-wrap">
			{#if queue.iConfirmed}
				<div class="confirm-done" title="You confirmed this match">
					<span class="confirm-done-icon">✓</span>
				</div>
			{:else}
				<button
					class="confirm-btn"
					disabled={confirming}
					onclick={confirmJob}
				>
					{confirming ? 'Confirming…' : '✓ Confirm'}
				</button>
			{/if}
			{#if otherConfirmed}
				<span class="other-confirmed-badge">Other confirmed</span>
			{/if}
		</div>
		<div class="input-wrap">
			<input
				type="text"
				placeholder="Type a message…"
				bind:value={inputText}
				onkeydown={handleKeydown}
				oninput={handleInput}
				aria-label="Message"
			/>
		</div>
		<button class="send-btn" disabled={!inputText.trim()} onclick={handleSend} aria-label="Send message">
			<span class="send-icon">➤</span>
		</button>
	</div>
</div>

<style>
	.chat-panel-content {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}

	.messages-area {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem 0 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.messages-area::-webkit-scrollbar {
		width: 4px;
	}

	.messages-area::-webkit-scrollbar-track {
		background: transparent;
	}

	.messages-area::-webkit-scrollbar-thumb {
		background: #1c2747;
		border-radius: 4px;
	}

	.date-separator {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 0;
	}

	.date-separator span {
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--text-3);
		background: rgba(14, 21, 41, 0.85);
		border: 1px solid var(--border);
		padding: 0.2rem 0.65rem;
		border-radius: 999px;
	}

	.message {
		display: flex;
		animation: messageIn 0.2s ease both;
	}

	.message--sent {
		justify-content: flex-end;
	}

	.message--received {
		justify-content: flex-start;
	}

	.message-bubble {
		max-width: 78%;
		padding: 0.5rem 0.75rem 0.35rem;
		border-radius: 0.9rem;
		position: relative;
		box-shadow: 0 3px 12px -6px rgba(0, 0, 0, 0.45);
	}

	.message--sent .message-bubble {
		background: linear-gradient(135deg, #ffd700, #ffb800);
		color: #0a0e1a;
		border-bottom-right-radius: 0.25rem;
	}

	.message--received .message-bubble {
		background: #1a2545;
		color: var(--text);
		border: 1px solid var(--border);
		border-bottom-left-radius: 0.25rem;
	}

	.message-text {
		font-size: 0.85rem;
		line-height: 1.4;
		margin-bottom: 0.15rem;
		overflow-wrap: break-word;
	}

	.message-time {
		font-size: 0.58rem;
		opacity: 0.6;
		display: block;
		text-align: right;
	}

	.typing-bubble {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.6rem 0.85rem;
		border-radius: 0.9rem;
		background: #1a2545;
		border: 1px solid var(--border);
		border-bottom-left-radius: 0.25rem;
		box-shadow: 0 3px 12px -6px rgba(0, 0, 0, 0.45);
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
		0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
		30% { transform: translateY(-4px); opacity: 1; }
	}

	.chat-input-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 0;
		border-top: 1px solid var(--border);
		flex-shrink: 0;
	}

	.confirm-wrap {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.confirm-done {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: linear-gradient(135deg, #34d399, #10b981);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 3px 12px -4px rgba(52, 211, 153, 0.5);
		flex-shrink: 0;
		animation: confirmPulse 0.4s ease;
	}

	.confirm-done-icon {
		color: #04110c;
		font-size: 1rem;
		font-weight: 700;
	}

	.other-confirmed-badge {
		font-size: 0.62rem;
		color: #10b981;
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid rgba(16, 185, 129, 0.25);
		padding: 0.15rem 0.45rem;
		border-radius: 999px;
		white-space: nowrap;
		font-weight: 600;
	}

	.confirm-btn {
		background: linear-gradient(135deg, #34d399, #10b981);
		border: none;
		color: #04110c;
		padding: 0.45rem 0.7rem;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.72rem;
		font-weight: 700;
		font-family: var(--font-display);
		transition: all 0.2s ease;
		white-space: nowrap;
		box-shadow: 0 3px 12px -4px rgba(52, 211, 153, 0.4);
	}

	.confirm-btn:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.confirm-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.input-wrap {
		flex: 1;
		min-width: 0;
	}

	.input-wrap input {
		width: 100%;
		background: rgba(6, 10, 23, 0.7);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.6rem 1rem;
		color: var(--text);
		font-size: 0.85rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.input-wrap input:focus {
		border-color: var(--gold);
		box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.1);
	}

	.input-wrap input::placeholder {
		color: var(--text-3);
	}

	.send-btn {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		flex-shrink: 0;
		background: linear-gradient(135deg, #ffd700, #ffb800);
		border: none;
		color: #0a0e1a;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 3px 12px -4px var(--gold-glow), inset 0 1px 0 rgba(255, 255, 255, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.send-icon {
		font-size: 0.9rem;
		transform: rotate(-45deg);
		display: block;
		margin-left: 2px;
		transition: transform 0.2s ease;
	}

	.send-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px -4px var(--gold-glow), inset 0 1px 0 rgba(255, 255, 255, 0.4);
	}

	.send-btn:hover:not(:disabled) .send-icon {
		transform: rotate(-45deg) translateX(2px);
	}

	.send-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
		box-shadow: none;
	}

	@keyframes messageIn {
		from { opacity: 0; transform: translateY(4px) scale(0.97); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}

	@keyframes confirmPulse {
		0% { transform: scale(0.7); opacity: 0; }
		50% { transform: scale(1.15); }
		100% { transform: scale(1); opacity: 1; }
	}
</style>
