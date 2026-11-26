<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	import type { BrowseTarget } from './browse-target.js';
	import type { Service } from '#lib/catalog/streaming.js';
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
	import LoadMore from '#lib/components/LoadMore.svelte';
	import { InfinitePages } from '#lib/components/infinite.svelte.js';

	interface Props {
		kind: WorkKind;
		target?: BrowseTarget;
		/** Heading of the page; the kind of works by default. */
		title?: string;
		/** Small line above the heading. */
		kicker?: string;
		/** Shown between the heading and the works. */
		children?: Snippet;
		genres: Genre[];
		/** Streaming services of the account, offered as a filter. */
		services?: Service[];
		filter: BrowseFilter;
		visibility: ListVisibility;
		works: (FilmSummary & { watched: boolean })[];
		page: number;
		totalPages: number;
		/** Number of works matching the filter at TMDB. */
		total: number;
	}

	let {
		kind,
		target = { page: 'browse' },
		title: heading,
		kicker,
		children,
		genres,
		services = [],
		filter,
		visibility,
		works,
		page,
		totalPages,
		total
	}: Props = $props();

	type Work = Props['works'][number];

	const pages = new InfinitePages<Work>(
		() => ({ items: works, page, more: page < totalPages }),
		(data) => {
			const next = data as Partial<Pick<Props, 'works' | 'page' | 'totalPages'>>;
			return next.works && next.page !== undefined && next.totalPages !== undefined
				? { items: next.works, page: next.page, more: next.page < next.totalPages }
				: null;
		},
		(work) => String(work.id)
	);

	const path = $derived(
		target.page === 'studio'
			? resolve('/(app)/studio/[id]', { id: String(target.id) })
			: target.page === 'network'
				? resolve('/(app)/network/[id]', { id: String(target.id) })
				: resolve(browseRoute(kind))
	);
	const title = $derived(heading ?? (kind === 'series' ? m.nav_series() : m.nav_films()));
	/** Query kept on every link, choosing the series of a studio. */
	const fixed = $derived(target.page === 'studio' && kind === 'series' ? 'kind=series' : '');
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
		const rest = browseQuery({ ...filter, show: visibility, ...change, page: change.page ?? 1 });
		return [fixed, rest].filter(Boolean).join('&');
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
		...(services.length > 0
			? [
					{
						label: services.find((item) => item.id === filter.service)?.name ?? m.filter_service(),
						entries: [
							entry(m.filter_any_service(), { service: null }, filter.service === null),
							...services.map((item) =>
								entry(item.name, { service: item.id }, filter.service === item.id)
							)
						]
					}
				]
			: []),
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
	<h1 class:named={kicker !== undefined}>
		{#if kicker}<span class="kicker">{kicker}</span>{/if}
		{title}
	</h1>
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

{@render children?.()}

<p class="count">{count}</p>

{#if pages.items.length === 0}
	<p class="empty">{kind === 'series' ? m.series_browse_empty() : m.browse_empty()}</p>
{:else}
	<ul class="grid">
		{#each pages.items as work (work.id)}
			<li class:watched={work.watched}><FilmPoster film={{ ...work, kind }} size="medium" /></li>
		{/each}
	</ul>
{/if}

<LoadMore more={pages.more} loading={pages.loading} onmore={() => void pages.next()} />

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

	h1.named {
		color: var(--color-heading);
		font-family: var(--font-display);
		font-size: var(--font-size-title);
		font-weight: 700;
		letter-spacing: normal;
		line-height: 1.1;
		text-transform: none;
	}

	.kicker {
		display: block;
		font-family: var(--font-body);
		font-weight: 400;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
		color: var(--color-text);
		font-size: var(--font-size-small);
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

	@media (max-width: 48rem) {
		.years ul {
			flex-wrap: wrap;
		}
	}
</style>
