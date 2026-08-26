<script lang="ts">
	import { messages } from '$lib/stores/messages.svelte';
	import { initials } from '$lib/utils';
	import { tick } from 'svelte';

	let inputText = $state('');
	let messagesEl: HTMLDivElement | null = $state(null);
	let isTyping = $state(false);

	const conversation = $derived(messages.activeConversation);

	function handleSend() {
		if (!inputText.trim()) return;
		messages.sendMessage(inputText);
		inputText = '';
		isTyping = true;
		// Simulate "typing" indicator then reply
		setTimeout(() => {
			isTyping = false;
		}, 2000);
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

	function formatDay(date: Date) {
		const today = new Date();
		const d = new Date(date);
		if (d.toDateString() === today.toDateString()) return 'Today';
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}

	function shouldShowDate(index: number): boolean {
		if (index === 0) return true;
		const prev = messages.messages[index - 1];
		const curr = messages.messages[index];
		return new Date(prev.timestamp).toDateString() !== new Date(curr.timestamp).toDateString();
	}

	function handleBack() {
		messages.clearActive();
	}

	$effect(() => {
		void messages.messages.length;
		tick().then(() => {
			if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
		});
	});
</script>

{#if conversation}
	<div class="messenger-chat">
		<!-- Chat Header -->
		<div class="chat-header">
			<button class="back-btn" onclick={handleBack} aria-label="Back to conversations">
				<span class="back-arrow">←</span>
			</button>

			<div class="header-avatar-wrap">
				<div class="header-avatar">
					{initials(conversation.participantName)}
				</div>
				{#if conversation.online}
					<span class="online-dot"></span>
				{/if}
			</div>

			<div class="header-info">
				<h3 class="header-name">{conversation.participantName}</h3>
				<span class="header-status">
					{#if conversation.online}
						<span class="status-dot online"></span> Active now
					{:else}
						<span class="status-dot"></span> Offline
					{/if}
				</span>
			</div>

			<div class="header-actions">
				<button class="action-btn" aria-label="Voice call">📞</button>
				<button class="action-btn" aria-label="Video call">📹</button>
				<button class="action-btn" aria-label="Info">ℹ️</button>
			</div>
		</div>

		<!-- Messages Area -->
		<div class="messages-area" bind:this={messagesEl}>
			{#each messages.messages as msg, i (msg.id)}
				{#if shouldShowDate(i)}
					<div class="date-divider">
						<span class="date-label">{formatDay(msg.timestamp)}</span>
					</div>
				{/if}

				<div class="message-row" class:sent={msg.isMe} class:received={!msg.isMe}>
					{#if !msg.isMe}
						<div class="msg-avatar">
							{initials(conversation.participantName)}
						</div>
					{/if}

					<div class="msg-content">
						<div class="msg-bubble" class:sent-bubble={msg.isMe} class:received-bubble={!msg.isMe}>
							<p class="msg-text">{msg.text}</p>
						</div>
						<span class="msg-time" class:time-sent={msg.isMe}>{formatTime(msg.timestamp)}</span>
					</div>
				</div>
			{/each}

			{#if isTyping}
				<div class="message-row received">
					<div class="msg-avatar">
						{initials(conversation.participantName)}
					</div>
					<div class="msg-content">
						<div class="msg-bubble received-bubble typing-bubble">
							<div class="typing-dots">
								<span class="dot"></span>
								<span class="dot"></span>
								<span class="dot"></span>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Input Area -->
		<div class="chat-input-area">
			<button class="input-action-btn" aria-label="Attach file">📎</button>
			<button class="input-action-btn" aria-label="Send photo">🖼️</button>

			<div class="input-wrap">
				<input
					type="text"
					class="message-input"
					placeholder="Aa"
					bind:value={inputText}
					onkeydown={handleKeydown}
					aria-label="Type a message"
				/>
				<button class="emoji-btn" aria-label="Emoji">😊</button>
			</div>

			{#if inputText.trim()}
				<button class="send-btn" onclick={handleSend} aria-label="Send message">
					<span class="send-icon">➤</span>
				</button>
			{:else}
				<button class="input-action-btn" aria-label="Like">👍</button>
			{/if}
		</div>
	</div>
{:else}
	<div class="no-conversation">
		<div class="no-chat-illustration">
			<span class="big-icon">💬</span>
		</div>
		<h3 class="no-chat-title">Your Messages</h3>
		<p class="no-chat-desc">Send private messages to a friend or group</p>
	</div>
{/if}

<style>
	.messenger-chat {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--bg);
	}

	/* Header */
	.chat-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border);
		background: rgba(11, 17, 34, 0.8);
		backdrop-filter: blur(12px);
		flex-shrink: 0;
	}

	.back-btn {
		display: none;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--text);
		cursor: pointer;
		font-size: 1rem;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.back-btn:hover {
		background: var(--surface-2);
		border-color: var(--gold);
	}

	.back-arrow {
		transition: transform 0.2s ease;
	}

	.back-btn:hover .back-arrow {
		transform: translateX(-2px);
	}

	.header-avatar-wrap {
		position: relative;
		flex-shrink: 0;
	}

	.header-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: linear-gradient(135deg, #5b8cff, #4a75e0);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.85rem;
		font-weight: 700;
		font-family: var(--font-display);
	}

	.online-dot {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: var(--success);
		border: 2.5px solid var(--bg-elevated);
		box-shadow: 0 0 8px rgba(52, 211, 153, 0.6);
	}

	.header-info {
		flex: 1;
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

	.header-status {
		font-size: 0.72rem;
		color: var(--text-3);
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.status-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--text-3);
	}

	.status-dot.online {
		background: var(--success);
		box-shadow: 0 0 6px rgba(52, 211, 153, 0.5);
	}

	.header-actions {
		display: flex;
		gap: 0.35rem;
		flex-shrink: 0;
	}

	.action-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--surface);
		border: 1px solid var(--border);
		cursor: pointer;
		font-size: 0.9rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}

	.action-btn:hover {
		background: var(--surface-2);
		border-color: rgba(91, 140, 255, 0.4);
	}

	/* Messages Area */
	.messages-area {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.messages-area::-webkit-scrollbar {
		width: 5px;
	}

	.messages-area::-webkit-scrollbar-track {
		background: transparent;
	}

	.messages-area::-webkit-scrollbar-thumb {
		background: #1c2747;
		border-radius: 4px;
	}

	.date-divider {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem 0;
	}

	.date-label {
		font-size: 0.68rem;
		font-weight: 600;
		color: var(--text-3);
		background: var(--surface);
		padding: 0.25rem 0.85rem;
		border-radius: 999px;
		border: 1px solid var(--border);
	}

	.message-row {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
		max-width: 70%;
		animation: msgIn 0.25s ease both;
	}

	.message-row.sent {
		align-self: flex-end;
		flex-direction: row-reverse;
	}

	.message-row.received {
		align-self: flex-start;
	}

	.msg-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: linear-gradient(135deg, #5b8cff, #4a75e0);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.6rem;
		font-weight: 700;
		flex-shrink: 0;
	}

	.msg-content {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.msg-bubble {
		padding: 0.6rem 0.85rem;
		border-radius: 1.15rem;
		position: relative;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	.received-bubble {
		background: var(--surface-2);
		color: var(--text);
		border: 1px solid var(--border);
		border-bottom-left-radius: 0.35rem;
	}

	.sent-bubble {
		background: linear-gradient(135deg, #5b8cff, #4a75e0);
		color: #fff;
		border-bottom-right-radius: 0.35rem;
		box-shadow: 0 4px 14px -4px rgba(91, 140, 255, 0.35);
	}

	.msg-text {
		font-size: 0.9rem;
		line-height: 1.45;
		margin: 0;
	}

	.msg-time {
		font-size: 0.62rem;
		color: var(--text-3);
		padding: 0 0.3rem;
	}

	.time-sent {
		text-align: right;
	}

	/* Typing indicator */
	.typing-bubble {
		padding: 0.6rem 1rem;
	}

	.typing-dots {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--text-3);
		animation: typing 1.2s infinite;
	}

	.dot:nth-child(2) {
		animation-delay: 0.15s;
	}

	.dot:nth-child(3) {
		animation-delay: 0.3s;
	}

	/* Input Area */
	.chat-input-area {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--border);
		background: rgba(11, 17, 34, 0.8);
		backdrop-filter: blur(12px);
		flex-shrink: 0;
	}

	.input-action-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 1.1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s ease;
		flex-shrink: 0;
	}

	.input-action-btn:hover {
		background: var(--surface);
	}

	.input-wrap {
		flex: 1;
		position: relative;
		display: flex;
		align-items: center;
	}

	.message-input {
		width: 100%;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.6rem 2.5rem 0.6rem 1rem;
		color: var(--text);
		font-size: 0.9rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.message-input:focus {
		border-color: #5b8cff;
		box-shadow: 0 0 0 3px rgba(91, 140, 255, 0.12);
	}

	.message-input::placeholder {
		color: var(--text-3);
	}

	.emoji-btn {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1.1rem;
		opacity: 0.6;
		transition: opacity 0.2s ease;
	}

	.emoji-btn:hover {
		opacity: 1;
	}

	.send-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: linear-gradient(135deg, #5b8cff, #4a75e0);
		border: none;
		color: #fff;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		box-shadow: 0 4px 14px -4px rgba(91, 140, 255, 0.5);
		flex-shrink: 0;
		animation: fadeIn 0.2s ease;
	}

	.send-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 20px -4px rgba(91, 140, 255, 0.6);
	}

	.send-icon {
		font-size: 0.9rem;
		transform: rotate(-45deg);
		margin-left: 1px;
	}

	/* No conversation state */
	.no-conversation {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		text-align: center;
		padding: 2rem;
	}

	.no-chat-illustration {
		margin-bottom: 1rem;
	}

	.big-icon {
		font-size: 4rem;
		opacity: 0.7;
	}

	.no-chat-title {
		font-family: var(--font-display);
		font-size: 1.35rem;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 0.4rem;
	}

	.no-chat-desc {
		font-size: 0.9rem;
		color: var(--text-3);
	}

	@keyframes msgIn {
		from { opacity: 0; transform: translateY(8px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@keyframes typing {
		0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
		30% { opacity: 1; transform: translateY(-3px); }
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: scale(0.9); }
		to { opacity: 1; transform: scale(1); }
	}

	@media (max-width: 768px) {
		.back-btn {
			display: flex;
		}

		.header-actions {
			display: none;
		}

		.message-row {
			max-width: 85%;
		}

		.messages-area {
			padding: 0.75rem 0.75rem;
		}
	}
</style>
