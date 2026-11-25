<script lang="ts">
	import '#lib/styles/base.css';
	import '#lib/styles/forms.css';
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

{@render children()}

<SiteFooter />
