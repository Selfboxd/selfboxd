<script lang="ts">
	import {
		watchedQuery,
		watchedSorts,
		type PosterSize,
		type WatchedOptions,
		type WatchedSort
	} from '#lib/catalog/watched-view.js';
	import type { RatingScale, WatchedWork } from '#lib/catalog/library.js';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import FilterMenus from '#lib/components/FilterMenus.svelte';
	import type { FilterEntry, FilterMenu } from '#lib/components/filter-menus.js';
	import Icon from '#lib/components/Icon.svelte';
	import RatingDisplay from '#lib/components/library/RatingDisplay.svelte';
	import { ratingLabel } from '#lib/i18n/ratings.js';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		title: string;
		/** Said when nothing was watched at all. */
		empty: string;
		/** Resolved address of the page, which the filters link to. */
		path: string;
		works: WatchedWork[];
		total: number;
		options: WatchedOptions;
		decades: number[];
		genres: string[];
		services: { id: number; name: string }[];
		scale: RatingScale;
	}

	let { title, empty, path, works, total, options, decades, genres, services, scale }: Props =
		$props();

	const sortLabels: Record<WatchedSort, () => string> = {
		watched: m.watched_sort_recent,
		release: m.diary_sort_release,
		release_oldest: m.diary_sort_release_oldest,
		rating: m.diary_sort_rating,
		rating_lowest: m.diary_sort_rating_lowest,
		name: m.list_sort_name
	};

	function address(change: Partial<WatchedOptions>): string {
		const query = watchedQuery({ ...options, ...change });
		return query ? `${path}?${query}` : path;
	}

	function entry(label: string, change: Partial<WatchedOptions>, current: boolean): FilterEntry {
		return { label, query: watchedQuery({ ...options, ...change }), current };
	}

	const menus = $derived.by((): FilterMenu[] => {
		const ratings = Array.from({ length: 10 }, (_, index) => 10 - index);
		return [
			{
				label: m.watched_show(),
				icon: 'eye',
				entries: [
					entry(m.watched_show_all(), { liked: false }, !options.liked),
					entry(m.watched_show_liked(), { liked: true }, options.liked)
				]
			},
			{
				label: `${m.list_sort_by()} ${sortLabels[options.sort]()}`,
				entries: watchedSorts.map((sort) =>
					entry(sortLabels[sort](), { sort }, options.sort === sort)
				)
			},
			...(services.length > 0
				? [
						{
							label:
								services.find((item) => item.id === options.service)?.name ?? m.filter_service(),
							entries: [
								entry(m.filter_any_service(), { service: null }, options.service === null),
								...services.map((item) =>
									entry(item.name, { service: item.id }, options.service === item.id)
								)
							]
						}
					]
				: []),
			...(genres.length > 0
				? [
						{
							label: options.genre ?? m.list_genre(),
							entries: [
								entry(m.list_any_genre(), { genre: null }, options.genre === null),
								...genres.map((genre) => entry(genre, { genre }, options.genre === genre))
							]
						}
					]
				: []),
			{
				label:
					options.decade === null
						? m.list_decade()
						: m.browse_decade({ decade: String(options.decade) }),
				entries: [
					entry(m.list_any_decade(), { decade: null }, options.decade === null),
					...decades.map((decade) =>
						entry(
							m.browse_decade({ decade: String(decade) }),
							{ decade },
							options.decade === decade
						)
					)
				]
			},
			{
				label:
					options.rating === null
						? m.diary_column_rating()
						: options.rating === 'none'
							? m.diary_rating_none()
							: ratingLabel(options.rating, scale),
				entries: [
					entry(m.diary_any_rating(), { rating: null }, options.rating === null),
					entry(m.diary_rating_none(), { rating: 'none' }, options.rating === 'none'),
					...ratings.map((rating) =>
						entry(ratingLabel(rating, scale), { rating }, options.rating === rating)
					)
				]
			}
		];
	});

	const sizes: { size: PosterSize; label: () => string }[] = [
		{ size: 'small', label: m.poster_size_small },
		{ size: 'large', label: m.poster_size_large }
	];
</script>

<header class="head">
	<h1>{title}</h1>
	{#if total > 0}
		<div class="tools">
			<div class="sizes">
				{#each sizes as item (item.size)}
					<!-- eslint-disable svelte/no-navigation-without-resolve -- built from the resolved path -->
					<a
						href={address({ size: item.size })}
						aria-current={options.size === item.size ? 'true' : undefined}
					>
						{item.label()}
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/each}
			</div>
			<FilterMenus {menus}>
				{#snippet link(item: FilterEntry)}
					<!-- eslint-disable svelte/no-navigation-without-resolve -- built from the resolved path -->
					<a
						href="{path}{item.query ? `?${item.query}` : ''}"
						aria-current={item.current ? 'true' : undefined}
					>
						{item.label}
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/snippet}
			</FilterMenus>
		</div>
	{/if}
</header>

{#if total === 0}
	<p class="empty">{empty}</p>
{:else if works.length === 0}
	<p class="empty">{m.watched_filtered_empty()}</p>
{:else}
	<ul class="grid {options.size}">
		{#each works as { work, rating, liked } (work.id)}
			<li>
				<FilmPoster film={{ ...work, id: work.externalId }} size="fill" />
				<p class="meta">
					{#if rating !== null}<RatingDisplay {rating} {scale} />{/if}
					{#if liked}<span class="liked">
							<Icon name="heart" filled label={m.action_liked()} />
						</span>{/if}
				</p>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		align-items: end;
		justify-content: space-between;
		margin-bottom: var(--space-4);
		padding-bottom: var(--space-1);
		border-bottom: 1px solid var(--color-border);
	}

	h1 {
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-control);
		font-weight: 400;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.tools {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
		margin-inline-start: auto;
	}

	.sizes {
		display: flex;
		gap: var(--space-2);
		padding-inline-end: var(--space-2);
		border-inline-end: 1px solid var(--color-border);
	}

	.sizes a {
		color: var(--color-text-muted);
		font-size: var(--font-size-filter);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.sizes a:hover,
	.sizes a[aria-current='true'] {
		color: var(--color-text-strong);
	}

	.empty {
		color: var(--color-text);
	}

	.grid {
		display: grid;
		gap: var(--space-3) var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.grid.small {
		grid-template-columns: repeat(auto-fill, minmax(var(--poster-small), 1fr));
	}

	.grid.large {
		grid-template-columns: repeat(auto-fill, minmax(var(--poster-medium), 1fr));
		gap: var(--space-4) var(--space-3);
	}

	.meta {
		display: flex;
		gap: var(--space-1);
		align-items: center;
		min-height: 1.5em;
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--font-size-micro);
	}

	.large .meta {
		font-size: var(--font-size-small);
	}

	.meta :global(.rating) {
		color: var(--color-text-muted);
	}

	.liked {
		display: flex;
	}
</style>
