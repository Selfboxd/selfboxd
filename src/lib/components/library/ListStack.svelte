<script lang="ts">
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import type { WorkKind } from '#lib/catalog/library.js';

	interface Props {
		/** First works of the list, in order. */
		works: {
			id: number | string;
			kind?: WorkKind;
			title: string;
			year: number | null;
			posterPath: string | null;
		}[];
		href: string;
	}

	let { works, href }: Props = $props();

	/** Posters a stack always shows, empty slots filling a shorter list. */
	const slots = 5;

	const shown = $derived(works.slice(0, slots));
	const empty = $derived(Array.from({ length: slots - shown.length }, (_, index) => index));
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass a resolved address -->
<a class="stack" {href} tabindex="-1" aria-hidden="true">
	{#each shown as work, index (index)}
		<FilmPoster film={work} size="fill" linked={false} actions={false} />
	{/each}
	{#each empty as slot (slot)}<span class="slot"></span>{/each}
</a>

<style>
	.stack {
		position: relative;
		display: flex;
		overflow: hidden;
		border-radius: var(--radius-medium);
		background: var(--color-stack);
		box-shadow: var(--shadow-stack);
	}

	.stack::after {
		position: absolute;
		z-index: 6;
		border-radius: inherit;
		box-shadow: var(--shadow-poster-frame);
		content: '';
		inset: 0;
		pointer-events: none;
		transition: box-shadow var(--duration-medium) var(--ease-out);
	}

	.stack:hover::after,
	.stack:focus-visible::after {
		box-shadow: var(--shadow-stack-hover);
	}

	.stack.stack > :global(*) {
		position: relative;
		flex: 0 0 34%;
		width: auto;
		border-radius: 0;
		aspect-ratio: 2 / 3;
		box-shadow: var(--shadow-poster-stack);
	}

	.stack > :global(* + *) {
		margin-inline-start: -17.5%;
	}

	.stack > :global(:nth-child(1)) {
		z-index: 5;
	}

	.stack > :global(:nth-child(2)) {
		z-index: 4;
	}

	.stack > :global(:nth-child(3)) {
		z-index: 3;
	}

	.stack > :global(:nth-child(4)) {
		z-index: 2;
	}

	.stack > :global(:nth-child(5)) {
		z-index: 1;
	}

	.stack > :global(.poster::after) {
		display: none;
	}

	.slot {
		background: var(--color-stack);
	}
</style>
