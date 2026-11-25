<script lang="ts">
	import type { DiaryEntry } from '#lib/catalog/library.js';
	import type { Season } from '#lib/catalog/series.js';
	import Backdrop from '#lib/components/Backdrop.svelte';
	import FilmActions from '#lib/components/film/FilmActions.svelte';
	import FilmDetails from '#lib/components/film/FilmDetails.svelte';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import FilmWatch from '#lib/components/film/FilmWatch.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import EntrySummary from '#lib/components/library/EntrySummary.svelte';
	import LogDialog from '#lib/components/library/LogDialog.svelte';
	import type { LogTarget } from '#lib/components/library/log-target.js';
	import ListsDialog from '#lib/components/library/ListsDialog.svelte';
	import WatchlistDialog from '#lib/components/library/WatchlistDialog.svelte';
	import TmdbSetupNotice from '#lib/components/TmdbSetupNotice.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { seasonName, seriesStatusName } from '#lib/i18n/series.js';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let logTarget = $state<LogTarget | null>(null);
	let watchlistOpen = $state(false);
	let listsOpen = $state(false);

	const scale = $derived(data.user?.ratingScale ?? 'stars');
	const watchlistError = $derived(
		form?.action === 'watchlist' && 'error' in form ? form.error : undefined
	);
	const loggedSeasons = $derived(
		new Set(data.state === 'ready' ? data.library.entries.map((entry) => entry.season) : [])
	);

	function formatCount(count: number): string {
		return new Intl.NumberFormat(getLocale()).format(count);
	}

	/** Opens the log dialog for the whole series, or for one of its seasons. */
	function log(season: number | null) {
		if (data.state !== 'ready') return;
		const { series, library } = data;
		logTarget = {
			kind: 'new',
			film: {
				id: String(series.id),
				kind: 'series',
				title: series.title,
				year: series.year,
				posterPath: series.posterPath
			},
			defaults: {
				rating: library.state.rating,
				liked: library.state.liked,
				rewatch: loggedSeasons.has(season),
				season
			},
			seasons: series.seasons.map((entry) => ({
				number: entry.number,
				name: seasonName(entry.number)
			}))
		};
	}

	function edit(entry: DiaryEntry) {
		if (data.state !== 'ready') return;
		logTarget = {
			kind: 'edit',
			entry,
			seasons: data.series.seasons.map((season) => ({
				number: season.number,
				name: seasonName(season.number)
			}))
		};
	}

	function seasonPoster(season: Season) {
		if (data.state !== 'ready') return null;
		return {
			id: `${String(data.series.id)}-${String(season.number)}`,
			title: season.name,
			year: season.year,
			posterPath: season.posterPath ?? data.series.posterPath
		};
	}
</script>

<svelte:head>
	<title>{data.state === 'ready' ? data.series.title : m.nav_series()} - Selfboxd</title>
</svelte:head>

{#if data.state === 'not_configured'}
	<TmdbSetupNotice isAdmin={data.user?.isAdmin ?? false} />
{:else if data.state === 'error'}
	<FormError message={errorMessage(data.error)} />
{:else}
	{@const series = data.series}
	{#if series.backdropPath}
		<Backdrop path={series.backdropPath} />
	{/if}

	<div class="film" class:with-backdrop={series.backdropPath}>
		<aside class="side">
			<FilmPoster film={{ ...series, kind: 'series' }} size="large" linked={false} actions />
			<FilmWatch watch={series.watch} trailerKey={series.trailerKey} />
		</aside>

		<div class="main">
			<header>
				<h1>{series.title}</h1>
				<p class="byline">
					{#if series.year}
						<span class="year">
							{series.year}{#if series.endYear && series.endYear !== series.year}&ndash;{series.endYear}{/if}
						</span>
					{/if}
					{#if series.creators.length > 0}
						<span class="directed">
							{m.series_created_by()}
							<span class="directors">
								{series.creators.map((person) => person.name).join(', ')}
							</span>
						</span>
					{/if}
				</p>
				{#if series.originalTitle !== series.title}
					<p class="original">{series.originalTitle}</p>
				{/if}
				<p class="facts">
					<span class="state">{series.ended ? m.series_ended() : m.series_ongoing()}</span>
					<span>{m.series_season_count({ count: series.seasonCount })}</span>
					<span>{m.series_episode_count({ count: series.episodeCount })}</span>
					{#if series.networks.length > 0}<span>{series.networks.join(', ')}</span>{/if}
				</p>
			</header>

			<div class="columns">
				<div class="text">
					{#if series.tagline}<p class="tagline">{series.tagline}</p>{/if}
					{#if series.overview}<p class="overview">{series.overview}</p>{/if}

					<FilmDetails film={series} />

					<p class="footer">
						{#if series.episodeRuntime}
							<span>{m.series_episode_runtime({ minutes: series.episodeRuntime })}</span>
						{/if}
						<span class="more-at">
							{m.film_more_at()}
							<a
								class="micro"
								href="https://www.themoviedb.org/tv/{series.id}"
								target="_blank"
								rel="noopener noreferrer"
							>
								TMDB
							</a>
						</span>
					</p>
				</div>

				<div class="sidebar">
					{#if form?.action === 'watch' && 'error' in form}
						<FormError message={errorMessage(form.error)} />
					{/if}
					<FilmActions
						state={data.library.state}
						{scale}
						series
						onlog={() => {
							log(null);
						}}
						onedit={() => {
							const [entry] = data.library.entries;
							if (entry) edit(entry);
						}}
						onwatchlist={() => (watchlistOpen = true)}
						onlists={() => (listsOpen = true)}
					/>
					{#if data.library.state.status}
						<p class="facts">
							<span class="state">{seriesStatusName(data.library.state.status)}</span>
						</p>
					{/if}

					<section class="ratings">
						<header class="ratings-header">
							<h2>{m.film_ratings()}</h2>
							{#if series.rating.count > 0}
								<span>{m.film_rating_count({ count: formatCount(series.rating.count) })}</span>
							{/if}
						</header>
						{#if series.rating.count > 0}
							<p class="average">{series.rating.average.toFixed(1)}<span>/10</span></p>
						{/if}
					</section>
				</div>
			</div>

			{#if series.seasons.length > 0}
				<section class="seasons">
					<h2 class="section-title">{m.series_seasons()}</h2>
					<ul>
						{#each series.seasons as season (season.number)}
							{@const poster = seasonPoster(season)}
							<li>
								{#if poster}<FilmPoster film={poster} size="small" linked={false} />{/if}
								<span class="season-name">{seasonName(season.number)}</span>
								<span class="season-meta">
									{#if season.year}<span>{season.year}</span>{/if}
									<span>{m.series_episode_count({ count: season.episodeCount })}</span>
								</span>
								<button
									class="season-log"
									class:logged={loggedSeasons.has(season.number)}
									type="button"
									aria-label={m.series_log_season({ name: seasonName(season.number) })}
									onclick={() => {
										log(season.number);
									}}
								>
									<Icon name={loggedSeasons.has(season.number) ? 'eye' : 'plus'} />
									{m.nav_log()}
								</button>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if data.library.entries.length > 0}
				<section class="activity" id="activity">
					<h2 class="section-title">{m.activity_title()}</h2>
					{#each data.library.entries as entry (entry.id)}
						<EntrySummary {entry} {scale} onedit={edit} />
					{/each}
				</section>
			{/if}
		</div>
	</div>

	<LogDialog bind:target={logTarget} {scale} />
	<ListsDialog
		bind:open={listsOpen}
		filmId={String(series.id)}
		kind="series"
		lists={data.library.lists}
		member={data.library.listMembership}
	/>
	<WatchlistDialog
		bind:open={watchlistOpen}
		current={data.library.watchlist}
		error={watchlistError}
	/>
{/if}

<style>
	.film {
		display: grid;
		grid-template-columns: var(--poster-large) minmax(0, 1fr);
		gap: var(--space-12);
		align-items: start;
	}

	.with-backdrop {
		margin-top: var(--backdrop-offset);
	}

	.side {
		position: sticky;
		top: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	h1 {
		display: inline;
		margin-inline-end: var(--space-2);
		font-family: var(--font-display);
		font-size: var(--font-size-film-title);
		font-weight: 900;
		line-height: 1.1;
		letter-spacing: -0.01em;
	}

	.byline {
		display: inline;
		color: var(--color-text);
		font-size: var(--font-size-large);
		font-weight: 300;
	}

	.year {
		margin-inline-end: var(--space-2);
		color: var(--color-text-strong);
	}

	.directed {
		display: inline-block;
	}

	.directors {
		color: var(--color-text-strong);
	}

	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		margin-top: var(--space-2);
		color: var(--color-text);
		font-size: var(--font-size-control);
	}

	.state {
		padding: 0 var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-chip);
		color: var(--color-text-strong);
	}

	.seasons {
		margin-top: var(--space-12);
	}

	.seasons ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--poster-small), 1fr));
		gap: var(--space-4) var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.seasons li {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-size: var(--font-size-small);
	}

	.seasons li :global(.poster) {
		width: 100%;
	}

	.season-name {
		color: var(--color-text-strong);
		font-weight: 700;
	}

	.season-meta {
		display: flex;
		flex-direction: column;
		color: var(--color-text-muted);
	}

	.season-log {
		display: flex;
		gap: var(--space-1);
		align-items: center;
		align-self: flex-start;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-text);
		font: inherit;
		cursor: pointer;
	}

	.season-log:hover {
		color: var(--color-heading);
	}

	.season-log.logged {
		color: var(--color-highlight);
	}

	.original {
		margin-top: var(--space-1);
		color: var(--color-text);
		font-style: italic;
	}

	.columns {
		display: grid;
		grid-template-columns: minmax(0, 1fr) var(--sidebar-width);
		gap: var(--space-12);
		margin-top: var(--space-8);
	}

	.tagline {
		margin-bottom: var(--space-3);
		font-size: var(--font-size-control);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.overview {
		margin-bottom: var(--space-8);
		font-family: var(--font-heading);
		font-size: var(--font-size-prose);
		line-height: 1.55;
	}

	.footer {
		display: flex;
		gap: var(--space-4);
		align-items: center;
		margin-top: var(--space-6);
		font-size: var(--font-size-small);
	}

	.more-at {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}

	.micro {
		padding: 0 var(--space-1);
		border: 2px solid var(--color-micro-border);
		border-radius: var(--radius-small);
		color: var(--color-text);
		font-size: var(--font-size-micro);
		letter-spacing: var(--letter-spacing-caps);
	}

	.micro:hover {
		border-color: var(--color-text);
		color: var(--color-heading);
	}

	.ratings-header {
		display: flex;
		gap: var(--space-2);
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: var(--space-3);
		padding-bottom: var(--space-1);
		border-bottom: 1px solid var(--color-border);
		font-size: var(--font-size-small);
	}

	.ratings-header h2 {
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-control);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.average {
		color: var(--color-text);
		font-size: var(--font-size-title);
		font-weight: 300;
		text-align: end;
	}

	.average span {
		font-size: var(--font-size-body);
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.activity {
		margin-top: var(--space-12);
	}

	@media (max-width: 48rem) {
		.film,
		.columns {
			grid-template-columns: minmax(0, 1fr);
		}

		.side {
			position: static;
			max-width: var(--poster-large);
		}
	}
</style>
