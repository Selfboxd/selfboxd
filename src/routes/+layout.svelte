<script lang="ts">
	import '#lib/styles/base.css';
	import '#lib/styles/forms.css';
	import favicon from '#lib/assets/favicon.svg';
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href={favicon} />
</svelte:head>

{@render children()}

<SiteFooter />
