<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Selfboxd</title>
</svelte:head>

<h1 class="welcome">{m.home_welcome({ username: data.user?.username ?? '' })}</h1>

<style>
	.welcome {
		padding: var(--space-8) 0;
		color: var(--color-text-muted);
		font-family: var(--font-body);
		font-size: var(--font-size-title);
		font-weight: 300;
		text-align: center;
	}
</style>
