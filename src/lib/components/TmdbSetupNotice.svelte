<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		/** Whether the signed-in account can add the key itself. */
		isAdmin: boolean;
	}

	let { isAdmin }: Props = $props();
</script>

<div class="notice" role="status">
	{#if isAdmin}
		<p>{m.tmdb_not_configured_admin()}</p>
		<a class="button button-primary" href={resolve('/(app)/settings/instance')}>
			{m.tmdb_open_settings()}
		</a>
	{:else}
		<p>{m.tmdb_not_configured_user()}</p>
	{/if}
</div>

<style>
	.notice {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		align-items: flex-start;
		padding: var(--space-6);
		border-radius: var(--radius-medium);
		background: var(--color-panel);
		color: var(--color-text-strong);
	}

	.notice a:hover {
		color: var(--color-accent-contrast);
	}
</style>
