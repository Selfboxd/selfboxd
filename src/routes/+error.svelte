<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';

	const message = $derived(
		page.status === 404
			? m.error_not_found()
			: page.status === 403
				? m.error_forbidden()
				: m.error_generic()
	);
</script>

<svelte:head>
	<title>{page.status} - Selfboxd</title>
</svelte:head>

<main class="error-page">
	<h1>{page.status}</h1>
	<p>{message}</p>
	<p><a href={resolve('/(app)')}>{m.error_back_home()}</a></p>
</main>

<style>
	.error-page {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: var(--space-3);
		align-items: center;
		justify-content: center;
		padding: var(--space-8) var(--space-4);
		text-align: center;
	}

	h1 {
		font-size: var(--font-size-display);
	}
</style>
