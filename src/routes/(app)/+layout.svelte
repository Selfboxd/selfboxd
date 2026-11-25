<script lang="ts">
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

{#if data.user}
	<SiteHeader user={data.user} />
{/if}

<main>
	{@render children()}
</main>

<style>
	main {
		flex: 1;
		width: 100%;
		max-width: var(--content-width);
		margin: 0 auto;
		padding: var(--space-8) var(--space-4);
	}
</style>
