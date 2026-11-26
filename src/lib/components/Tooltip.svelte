<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<span class="tooltip" aria-hidden="true" in:fade={{ delay: 380, duration: 160 }}>
	{@render children()}
</span>

<style>
	.tooltip {
		position: absolute;
		z-index: 30;
		bottom: calc(100% + var(--space-2));
		left: 50%;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-small);
		background: var(--color-tooltip);
		box-shadow: var(--shadow-menu);
		color: var(--color-heading);
		font-size: var(--font-size-control);
		font-weight: 600;
		line-height: 1.4;
		white-space: nowrap;
		pointer-events: none;
		transform: translateX(-50%);
	}

	.tooltip::after {
		position: absolute;
		top: 100%;
		left: 50%;
		border: 0.375rem solid transparent;
		border-top-color: var(--color-tooltip);
		content: '';
		transform: translateX(-50%);
	}
</style>
