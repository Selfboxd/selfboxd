<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Chart } from '#lib/catalog/charts.js';
	import type { FilmSummary } from '#lib/catalog/film.js';
	import ListStack from './ListStack.svelte';
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

	const compact = $derived(new Intl.NumberFormat(getLocale(), { notation: 'compact' }));
</script>

<article class:row>
	<ListStack works={list.preview} {href} />
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

	article:not(.row) > :global(.stack) {
		margin-bottom: var(--space-2);
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
