<script lang="ts">
	import '@fontsource/source-serif-4/900.css';
	import '#lib/styles/base.css';
	import '#lib/styles/forms.css';
	import favicon from '#lib/assets/favicon.svg';
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import Toaster from '#lib/components/toast/Toaster.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href={favicon} />
</svelte:head>

{@render children()}

<SiteFooter />

<Toaster />
