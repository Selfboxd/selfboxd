<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>Selfboxd</title>
</svelte:head>

<h1>Selfboxd</h1>
<p>{m.app_tagline()}</p>

<style>
	h1 {
		margin-bottom: var(--space-3);
		font-size: var(--font-size-title);
	}

	p {
		color: var(--color-text-muted);
		font-size: var(--font-size-large);
	}
</style>
