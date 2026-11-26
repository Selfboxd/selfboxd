<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '#lib/components/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		/** What is missing and who can add it. */
		message: string;
		/** Whether the signed-in account can open the settings that fix it. */
		isAdmin: boolean;
	}

	let { message, isAdmin }: Props = $props();
</script>

<div class="notice" role="status">
	<p>{message}</p>
	{#if isAdmin}
		<a href={resolve('/(app)/settings/instance')}>
			{m.tmdb_open_settings()}
			<Icon name="chevron-right" />
		</a>
	{/if}
</div>

<style>
	.notice {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-6);
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-8);
		padding: var(--space-4) var(--space-6);
		border-radius: var(--radius-medium);
		background: var(--color-panel);
		color: var(--color-text-strong);
	}

	a {
		display: inline-flex;
		gap: var(--space-1);
		align-items: center;
		color: var(--color-text-panel);
		font-size: var(--font-size-control);
		white-space: nowrap;
	}

	a:hover {
		color: var(--color-heading);
	}
</style>
