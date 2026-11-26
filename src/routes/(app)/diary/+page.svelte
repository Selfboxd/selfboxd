<script lang="ts">
	import { workRoute } from '#lib/paths.js';
	import { seasonName } from '#lib/i18n/series.js';
	import { resolve } from '$app/paths';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import LogDialog from '#lib/components/library/LogDialog.svelte';
	import type { LogTarget } from '#lib/components/library/log-target.js';
	import RatingDisplay from '#lib/components/library/RatingDisplay.svelte';
	import ProfileNav from '#lib/components/profile/ProfileNav.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import {
		diaryQuery,
		type DiaryOptions,
		type DiaryShow,
		type DiarySort
	} from '#lib/catalog/diary-view.js';
	import FilterMenus from '#lib/components/FilterMenus.svelte';
	import type { FilterEntry, FilterMenu } from '#lib/components/filter-menus.js';
	import { ratingLabel } from '#lib/i18n/ratings.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let logTarget = $state<LogTarget | null>(null);

	const scale = $derived(data.user?.ratingScale ?? 'stars');

	const monthFormat = $derived(
		new Intl.DateTimeFormat(getLocale(), { month: 'short', timeZone: 'UTC' })
	);

	const sortLabels: Record<DiarySort, () => string> = {
		watched: m.diary_sort_watched,
		watched_oldest: m.diary_sort_watched_oldest,
		release: m.diary_sort_release,
		release_oldest: m.diary_sort_release_oldest,
		rating: m.diary_sort_rating,
		rating_lowest: m.diary_sort_rating_lowest,
		name: m.list_sort_name
	};

	const showLabels: Record<DiaryShow, () => string> = {
		all: m.diary_show_all,
		first: m.diary_show_first,
		rewatches: m.diary_show_rewatches,
		reviews: m.diary_show_reviews
	};

	function entry(label: string, change: Partial<DiaryOptions>, current: boolean): FilterEntry {
		return { label, query: diaryQuery({ ...data.options, ...change }), current };
	}

	const menus = $derived.by((): FilterMenu[] => {
		const { options } = data;
		const ratings = Array.from({ length: 10 }, (_, index) => 10 - index);
		return [
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
			},
			{
				label: options.year === null ? m.diary_year() : String(options.year),
				entries: [
					entry(m.diary_any_year(), { year: null }, options.year === null),
					...data.years.map((year) => entry(String(year), { year }, options.year === year))
				]
			},
			{
				label:
					options.decade === null
						? m.list_decade()
						: m.browse_decade({ decade: String(options.decade) }),
				entries: [
					entry(m.list_any_decade(), { decade: null }, options.decade === null),
					...data.decades.map((decade) =>
						entry(
							m.browse_decade({ decade: String(decade) }),
							{ decade },
							options.decade === decade
						)
					)
				]
			},
			{
				label: options.genre ?? m.list_genre(),
				entries: [
					entry(m.list_any_genre(), { genre: null }, options.genre === null),
					...data.genres.map((genre) => entry(genre, { genre }, options.genre === genre))
				]
			},
			{
				label: `${m.list_sort_by()} ${sortLabels[options.sort]()}`,
				entries: (Object.keys(sortLabels) as DiarySort[]).map((sort) =>
					entry(sortLabels[sort](), { sort }, options.sort === sort)
				)
			},
			{
				label: m.list_visibility(),
				icon: 'eye',
				entries: (Object.keys(showLabels) as DiaryShow[]).map((show) =>
					entry(showLabels[show](), { show }, options.show === show)
				)
			}
		];
	});

	const rows = $derived(
		data.entries.map((entry, index) => {
			const month = entry.watchedOn.slice(0, 7);
			const year = entry.watchedOn.slice(0, 4);
			return {
				entry,
				month: data.entries[index - 1]?.watchedOn.slice(0, 7) === month ? null : month,
				year,
				day: Number(entry.watchedOn.slice(8, 10))
			};
		})
	);
</script>

<svelte:head>
	<title>{m.diary_title()} - Selfboxd</title>
</svelte:head>

<ProfileNav />

<header class="head">
	<h1>
		{m.diary_title()}
		{#if data.options.tag}
			<span class="tag">{data.options.tag}</span>
			<a href={resolve('/(app)/diary')}>{m.watchlist_filter_all()}</a>
		{/if}
	</h1>
	{#if data.total > 0}
		<FilterMenus {menus}>
			{#snippet link(item: FilterEntry)}
				<a
					href="{resolve('/(app)/diary')}{item.query ? `?${item.query}` : ''}"
					aria-current={item.current ? 'true' : undefined}
				>
					{item.label}
				</a>
			{/snippet}
		</FilterMenus>
	{/if}
</header>

{#if data.total === 0}
	<p class="empty">{m.diary_empty()}</p>
{:else if rows.length === 0}
	<p class="empty">{m.diary_filtered_empty()}</p>
{:else}
	<table>
		<thead>
			<tr>
				<th>{m.diary_column_month()}</th>
				<th>{m.diary_column_day()}</th>
				<th class="film-column">{m.diary_column_film()}</th>
				<th>{m.diary_column_released()}</th>
				<th>{m.diary_column_rating()}</th>
				<th>{m.diary_column_like()}</th>
				<th>{m.diary_column_rewatch()}</th>
				<th>{m.diary_column_review()}</th>
				<th>{m.diary_column_edit()}</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as { entry, month, year, day } (entry.id)}
				<tr>
					<td>
						{#if month}
							<span class="calendar">
								<span class="month">{monthFormat.format(new Date(`${month}-01`))}</span>
								<span class="year">{year}</span>
							</span>
						{/if}
					</td>
					<td class="day">{day}</td>
					<td class="film-column">
						<div class="film">
							<FilmPoster film={{ ...entry.work, id: entry.work.externalId }} size="tiny" />
							<a
								class="title"
								href={resolve(workRoute(entry.work.kind), { id: entry.work.externalId })}
							>
								{entry.work.title}
							</a>
							{#if entry.season !== null}
								<span class="season">{seasonName(entry.season)}</span>
							{/if}
						</div>
					</td>
					<td>{entry.work.year ?? ''}</td>
					<td>
						{#if entry.rating !== null}<RatingDisplay rating={entry.rating} {scale} />{/if}
					</td>
					<td class="like">
						{#if entry.liked}<Icon name="heart" filled label={m.action_liked()} />{/if}
					</td>
					<td>
						{#if entry.rewatch}<Icon name="rewatch" label={m.diary_column_rewatch()} />{/if}
					</td>
					<td>
						{#if entry.review}<Icon name="review" label={m.diary_column_review()} />{/if}
					</td>
					<td>
						<button type="button" onclick={() => (logTarget = { kind: 'edit', entry })}>
							<Icon name="pencil" label={m.diary_edit()} />
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<LogDialog bind:target={logTarget} {scale} />

<style>
	.tag {
		margin-inline: var(--space-2);
		padding: 0 var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-chip);
		color: var(--color-text-strong);
		text-transform: none;
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		align-items: end;
		justify-content: space-between;
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

	.empty {
		margin-top: var(--space-6);
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		background: var(--color-table-head);
	}

	th {
		padding: var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		font-weight: 400;
		letter-spacing: var(--letter-spacing-caps);
		text-align: center;
		text-transform: uppercase;
	}

	td {
		padding: var(--space-2);
		border-top: 1px solid var(--color-border-subtle);
		text-align: center;
		vertical-align: middle;
	}

	.film-column {
		width: 45%;
		text-align: start;
	}

	.calendar {
		position: relative;
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		width: var(--calendar-width);
		margin-top: var(--space-1);
		padding: var(--space-1) 0;
		border-radius: var(--radius-small);
		background: var(--color-panel);
		line-height: 1.1;
	}

	.calendar::before {
		position: absolute;
		top: calc(var(--space-1) * -1);
		left: 22%;
		width: 56%;
		height: var(--space-2);
		border-inline: 3px solid var(--color-text-muted);
		content: '';
	}

	.month {
		color: var(--color-text-strong);
		font-size: var(--font-size-small);
		font-weight: 700;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.year {
		color: var(--color-text-muted);
		font-size: var(--font-size-micro);
	}

	.day {
		color: var(--color-text-strong);
		font-size: var(--font-size-heading);
		font-weight: 300;
	}

	.film {
		display: flex;
		gap: var(--space-3);
		align-items: center;
	}

	.title {
		color: var(--color-heading);
		font-family: var(--font-heading);
		font-size: var(--font-size-large);
		font-weight: 700;
	}

	.title:hover {
		color: var(--color-link-hover);
	}

	.season {
		color: var(--color-text);
		font-size: var(--font-size-control);
	}

	.like {
		color: var(--color-like);
	}

	td button {
		padding: var(--space-1);
		border: 0;
		background: none;
		color: var(--color-text);
		font-size: var(--font-size-body);
		cursor: pointer;
	}

	td button:hover {
		color: var(--color-link-hover);
	}

	@media (max-width: 48rem) {
		th:nth-child(4),
		td:nth-child(4),
		th:nth-child(7),
		td:nth-child(7),
		th:nth-child(8),
		td:nth-child(8) {
			display: none;
		}
	}
</style>
