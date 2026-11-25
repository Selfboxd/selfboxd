<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		browseQuery,
		browseDecades,
		type BrowseFilter,
		type BrowseSort,
		type Genre
	} from '#lib/catalog/browse.js';
	import type { FilmSummary } from '#lib/catalog/film.js';
	import type { WorkKind } from '#lib/catalog/library.js';
	import type { ListVisibility } from '#lib/catalog/list-view.js';
	import FilterMenus from '#lib/components/FilterMenus.svelte';
	import type { FilterEntry } from '#lib/components/filter-menus.js';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import { browseCount } from '#lib/i18n/browse.js';
	import { m } from '#lib/paraglide/messages.js';
	import { browseRoute } from '#lib/paths.js';

	interface Props {
		kind: WorkKind;
		genres: Genre[];
		filter: BrowseFilter;
		visibility: ListVisibility;
		works: (FilmSummary & { watched: boolean })[];
		page: number;
		totalPages: number;
		/** Number of works matching the filter at TMDB. */
		total: number;
	}

	let { kind, genres, filter, visibility, works, page, totalPages, total }: Props = $props();

	const path = $derived(resolve(browseRoute(kind)));
	const title = $derived(kind === 'series' ? m.nav_series() : m.nav_films());
	const decade = $derived(filter.year === null ? filter.decade : Math.floor(filter.year / 10) * 10);
	const firstDecade = browseDecades().at(-1) ?? 0;
	const lastDecade = browseDecades()[0] ?? 0;
	const genre = $derived(genres.find((entry) => entry.id === filter.genre) ?? null);

	const sortLabels: Record<BrowseSort, () => string> = {
		popular: m.browse_sort_popular,
		rating: m.browse_sort_highest,
		rating_lowest: m.browse_sort_lowest,
		name: m.list_sort_name,
		upcoming: m.browse_upcoming
	};

	const visibilityLabels: Record<ListVisibility, () => string> = {
		all: m.list_show_all,
		unwatched: m.list_show_unwatched,
		watched: m.list_show_watched
	};

	type Change = Partial<BrowseFilter> & { show?: ListVisibility };

	function query(change: Change): string {
		return browseQuery({ ...filter, show: visibility, ...change, page: change.page ?? 1 });
	}

	function entry(label: string, change: Change, current: boolean): FilterEntry {
		return { label, query: query(change), current };
	}

	const menus = $derived([
		{
			label:
				filter.year !== null
					? String(filter.year)
					: decade !== null
						? m.browse_decade({ decade: String(decade) })
						: m.list_decade(),
			entries: [
				entry(m.list_any_decade(), { decade: null, year: null }, decade === null),
				...browseDecades().map((value) =>
					entry(
						m.browse_decade({ decade: String(value) }),
						{
							decade: value,
							year: null,
							sort: filter.sort === 'upcoming' ? 'popular' : filter.sort
						},
						decade === value && filter.year === null
					)
				)
			]
		},
		{
			label: genre?.name ?? m.list_genre(),
			entries: [
				entry(m.list_any_genre(), { genre: null }, filter.genre === null),
				...genres.map((item) => entry(item.name, { genre: item.id }, filter.genre === item.id))
			]
		},
		{
			label: `${m.list_sort_by()} ${sortLabels[filter.sort]()}`,
			entries: (Object.keys(sortLabels) as BrowseSort[]).map((sort) =>
				entry(
					sortLabels[sort](),
					sort === 'upcoming' ? { sort, decade: null, year: null } : { sort },
					filter.sort === sort
				)
			)
		},
		{
			label: m.list_visibility(),
			icon: 'eye' as const,
			entries: (Object.keys(visibilityLabels) as ListVisibility[]).map((show) =>
				entry(visibilityLabels[show](), { show }, visibility === show)
			)
		}
	]);

	const years = $derived(
		decade === null ? [] : Array.from({ length: 10 }, (_, index) => decade + index)
	);
	const count = $derived(
		browseCount(kind, {
			total,
			genre: genre?.name ?? null,
			decade: filter.year === null ? decade : null,
			year: filter.year
		})
	);
</script>

<header class="head">
	<h1>{title}</h1>
	<FilterMenus {menus}>
		{#snippet link(item: FilterEntry)}
			<a
				href="{path}{item.query ? `?${item.query}` : ''}"
				aria-current={item.current ? 'true' : undefined}
			>
				{item.label}
			</a>
		{/snippet}
	</FilterMenus>
</header>

{#if decade !== null}
	<nav class="years" aria-label={m.browse_year()}>
		{#if decade > firstDecade}
			<a
				class="arrow"
				href="{path}?{query({ decade: decade - 10, year: null })}"
				aria-label={m.browse_decade({ decade: String(decade - 10) })}
			>
				&#9664;
			</a>
		{:else}<span class="arrow"></span>{/if}
		<ul>
			<li>
				<a
					href="{path}?{query({ decade, year: null })}"
					aria-current={filter.year === null ? 'page' : undefined}
				>
					{m.browse_decade({ decade: String(decade) })}
				</a>
			</li>
			{#each years as year (year)}
				<li>
					<a
						href="{path}?{query({ decade: null, year })}"
						aria-current={filter.year === year ? 'page' : undefined}
					>
						{year}
					</a>
				</li>
			{/each}
		</ul>
		{#if decade < lastDecade}
			<a
				class="arrow"
				href="{path}?{query({ decade: decade + 10, year: null })}"
				aria-label={m.browse_decade({ decade: String(decade + 10) })}
			>
				&#9654;
			</a>
		{:else}<span class="arrow"></span>{/if}
	</nav>
{/if}

<p class="count">{count}</p>

{#if works.length === 0}
	<p class="empty">{kind === 'series' ? m.series_browse_empty() : m.browse_empty()}</p>
{:else}
	<ul class="grid">
		{#each works as work (work.id)}
			<li class:watched={work.watched}><FilmPoster film={{ ...work, kind }} size="medium" /></li>
		{/each}
	</ul>
{/if}

{#if totalPages > 1}
	<nav class="pages" aria-label={title}>
		{#if page > 1}
			<a class="button button-secondary" href="{path}?{query({ page: page - 1 })}">
				{m.search_previous()}
			</a>
		{/if}
		{#if page < totalPages}
			<a class="button button-secondary next" href="{path}?{query({ page: page + 1 })}">
				{m.search_next()}
			</a>
		{/if}
	</nav>
{/if}

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-6);
		padding-bottom: var(--space-1);
		border-bottom: 1px solid var(--color-border);
	}

	h1 {
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-large);
		font-weight: 400;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.years {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		justify-content: center;
		margin-bottom: var(--space-4);
	}

	.years ul {
		display: flex;
		overflow: hidden;
		margin: 0;
		padding: 0;
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-small);
		list-style: none;
	}

	.years li + li {
		border-inline-start: 1px solid var(--color-border-subtle);
	}

	.years ul a {
		display: block;
		padding: var(--space-1) var(--space-3);
		color: var(--color-text);
		font-size: var(--font-size-control);
	}

	.years ul a:hover {
		color: var(--color-heading);
	}

	.years ul a[aria-current] {
		background: var(--color-menu);
		color: var(--color-menu-text);
	}

	.arrow {
		width: var(--space-4);
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		text-align: center;
	}

	.arrow:hover {
		color: var(--color-heading);
	}

	.count {
		margin-bottom: var(--space-4);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-medium);
		background: var(--color-panel);
		color: var(--color-text-strong);
		font-size: var(--font-size-body);
		text-align: center;
	}

	.empty {
		color: var(--color-text);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--poster-browse), 1fr));
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.grid :global(.poster) {
		width: 100%;
	}

	.grid .watched :global(.poster img) {
		opacity: 0.5;
		transition: opacity var(--duration-fast);
	}

	.grid .watched:hover :global(.poster img) {
		opacity: 1;
	}

	.pages {
		display: flex;
		margin-top: var(--space-6);
	}

	.pages .next {
		margin-inline-start: auto;
	}

	@media (max-width: 48rem) {
		.years ul {
			flex-wrap: wrap;
		}
	}
</style>
