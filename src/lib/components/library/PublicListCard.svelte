<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Chart } from '#lib/catalog/charts.js';
	import type { FilmSummary } from '#lib/catalog/film.js';
	import { publicListPreviewSize } from '#lib/catalog/lists.js';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';

	interface Props {
		/** What the card tells about the list; counts are omitted when `null`. */
		list: {
			name: string;
			owner: string | null;
			itemCount: number | null;
			likes: number | null;
			preview: FilmSummary[];
		};
		/** The page the card opens: a public list or a TMDB chart. */
		target: { list: number } | { chart: Chart } | { personal: number };
		/** Whether the posters sit beside the name instead of above it. */
		row?: boolean;
	}

	let { list, target, row = false }: Props = $props();

	const href = $derived(
		'chart' in target
			? resolve('/(app)/lists/official/[chart]', { chart: target.chart })
			: 'personal' in target
				? resolve('/(app)/profile/lists/[id]', { id: String(target.personal) })
				: resolve('/(app)/lists/[id]', { id: String(target.list) })
	);

	const empty = $derived(
		Array.from({ length: publicListPreviewSize - list.preview.length }, (_, index) => index)
	);
	const compact = $derived(new Intl.NumberFormat(getLocale(), { notation: 'compact' }));
</script>

<article class:row>
	<a class="stack" {href} tabindex="-1" aria-hidden="true">
		{#each list.preview as film (film.id)}
			<FilmPoster {film} size="medium" linked={false} />
		{/each}
		{#each empty as slot (slot)}<span class="slot"></span>{/each}
	</a>
	<div class="text">
		<h3><a {href}>{list.name}</a></h3>
		<p class="meta">
			{#if list.owner}<span class="owner">{list.owner}</span>{/if}
			{#if list.itemCount !== null}<span>{m.list_count({ count: list.itemCount })}</span>{/if}
			{#if list.likes}
				<span class="likes"><Icon name="heart" filled /> {compact.format(list.likes)}</span>
			{/if}
		</p>
	</div>
</article>

<style>
	.row {
		display: grid;
		grid-template-columns: var(--list-stack-width) minmax(0, 1fr);
		gap: var(--space-4);
		align-items: center;
	}

	.row .stack {
		margin-bottom: 0;
	}

	.row h3 {
		font-size: var(--font-size-prose);
	}

	.text {
		min-width: 0;
	}

	h3 {
		overflow-wrap: anywhere;
	}

	.stack {
		display: flex;
		overflow: hidden;
		margin-bottom: var(--space-2);
		border-radius: var(--radius-medium);
		box-shadow: var(--shadow-poster-frame);
	}

	.stack :global(.poster),
	.slot {
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
		z-index: 4;
	}

	.stack > :global(:nth-child(2)) {
		z-index: 3;
	}

	.stack > :global(:nth-child(3)) {
		z-index: 2;
	}

	.stack > :global(:nth-child(4)) {
		z-index: 1;
	}

	.slot {
		position: relative;
		background: var(--color-chip);
	}

	.stack:hover {
		box-shadow: var(--shadow-poster-hover);
	}

	h3 {
		font-family: var(--font-body);
		font-size: var(--font-size-large);
		font-weight: 700;
	}

	h3 a {
		color: var(--color-heading);
	}

	h3 a:hover {
		color: var(--color-link-hover);
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		align-items: center;
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--font-size-control);
	}

	.owner {
		color: var(--color-text);
		font-weight: 700;
	}

	.likes {
		display: inline-flex;
		gap: var(--space-1);
		align-items: center;
	}
</style>
