<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<main>
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
</style>
