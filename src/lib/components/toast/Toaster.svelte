<script lang="ts">
	import { fly } from 'svelte/transition';
	import Icon from '#lib/components/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { toasts } from './toasts.svelte.js';
</script>

<div class="toaster" aria-live="polite">
	{#each toasts.items as toast (toast.id)}
		<div class="toast" role="status" in:fly={{ y: 12, duration: 180 }}>
			<span class="check"><Icon name="check" /></span>
			<span class="message">{toast.message}</span>
			<button
				type="button"
				aria-label={m.dialog_close()}
				onclick={() => {
					toasts.dismiss(toast.id);
				}}
			>
				<Icon name="close" />
			</button>
		</div>
	{/each}
</div>

<style>
	.toaster {
		position: fixed;
		z-index: 50;
		right: var(--space-6);
		bottom: var(--space-6);
		display: flex;
		max-width: min(100% - var(--space-8), var(--toast-width));
		flex-direction: column;
		gap: var(--space-2);
		pointer-events: none;
	}

	.toast {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
		border-radius: var(--radius-small);
		background: var(--color-panel);
		box-shadow: var(--shadow-button), var(--shadow-menu);
		color: var(--color-text-strong);
		font-size: var(--font-size-control);
		pointer-events: auto;
	}

	.check {
		display: flex;
		color: var(--color-accent);
	}

	.message {
		flex: 1;
	}

	button {
		display: flex;
		padding: var(--space-1);
		border: 0;
		border-radius: var(--radius-small);
		background: none;
		color: var(--color-text-muted);
		cursor: pointer;
	}

	button:hover {
		background: var(--color-well-hover);
		color: var(--color-heading);
	}

	@media (prefers-reduced-motion: reduce) {
		.toast {
			transition: none;
		}
	}
</style>
