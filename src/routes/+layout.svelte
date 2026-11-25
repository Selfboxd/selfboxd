<script lang="ts">
	import '#lib/styles/base.css';
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<main>
	{@render children()}
</main>

<SiteFooter />

<style>
	main {
		flex: 1;
		width: 100%;
		max-width: var(--content-width);
		margin: 0 auto;
		padding: var(--space-8) var(--space-4);
	}
</style>
