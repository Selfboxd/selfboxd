<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<main>
	<p class="wordmark">Selfboxd</p>
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
		color: var(--color-heading);
		font-size: var(--font-size-title);
		font-weight: 700;
		letter-spacing: -0.02em;
	}
</style>
