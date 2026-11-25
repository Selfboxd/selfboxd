<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		browseQuery,
		type BrowseFilter,
		type BrowseSort,
		type Genre
	} from '#lib/catalog/browse.js';
	import type { FilmSummary } from '#lib/catalog/film.js';
	import type { WorkKind } from '#lib/catalog/library.js';
	import { browseRoute } from '#lib/paths.js';
	import FilmBrowseBar from '#lib/components/film/FilmBrowseBar.svelte';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		kind: WorkKind;
		genres: Genre[];
		filter: BrowseFilter;
		works: FilmSummary[];
		page: number;
		totalPages: number;
	}

	let { kind, genres, filter, works, page, totalPages }: Props = $props();

	const title = $derived(kind === 'series' ? m.nav_series() : m.nav_films());

	const sortLabels: Record<BrowseSort, () => string> = {
		popular: m.browse_popular,
		rating: m.browse_highest,
		rating_lowest: m.browse_lowest,
		name: m.browse_name,
		upcoming: m.browse_upcoming
	};

	const chips = $derived.by(() => {
		return [
			sortLabels[filter.sort](),
			...(filter.year ? [String(filter.year)] : []),
			...(filter.decade && !filter.year
				? [m.browse_decade({ decade: String(filter.decade) })]
				: []),
			...genres.filter((genre) => genre.id === filter.genre).map((genre) => genre.name)
		];
	});
</script>

<div class="tools"><FilmBrowseBar {genres} {kind} {filter} /></div>

<h1 class="section-title">
	{title}
	{#each chips as chip (chip)}<span class="chip">{chip}</span>{/each}
</h1>

{#if works.length === 0}
	<p>{kind === 'series' ? m.series_browse_empty() : m.browse_empty()}</p>
{:else}
	<ul>
		{#each works as work (work.id)}
			<li><FilmPoster film={{ ...work, kind }} size="medium" /></li>
		{/each}
	</ul>
{/if}

{#if totalPages > 1}
	<nav class="pages" aria-label={title}>
		{#if page > 1}
			<a
				class="button button-secondary"
				href="{resolve(browseRoute(kind))}?{browseQuery({
					...filter,
					page: page - 1
				})}"
			>
				{m.search_previous()}
			</a>
		{/if}
		{#if page < totalPages}
			<a
				class="button button-secondary next"
				href="{resolve(browseRoute(kind))}?{browseQuery({
					...filter,
					page: page + 1
				})}"
			>
				{m.search_next()}
			</a>
		{/if}
	</nav>
{/if}

<style>
	.tools {
		margin-bottom: var(--space-6);
	}

	.chip {
		margin-inline-start: var(--space-2);
		padding: 0 var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-chip);
		color: var(--color-text-strong);
		text-transform: none;
	}

	ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	ul :global(.poster) {
		width: 100%;
	}

	.pages {
		display: flex;
		margin-top: var(--space-6);
	}

	.pages .next {
		margin-inline-start: auto;
	}
</style>
