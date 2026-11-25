<script lang="ts">
	import SiteLogo from '#lib/components/SiteLogo.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<main>
	<p class="wordmark"><SiteLogo /></p>
	{@render children()}
</main>

<style>
	main {
		flex: 1;
		width: 100%;
		max-width: var(--narrow-width);
		margin: 0 auto;
		padding: var(--space-12) var(--space-4);
	}

	.wordmark {
		margin-bottom: var(--space-8);
	}
</style>
