<script lang="ts">
	import { resolve } from '$app/paths';
	import type { FilmSummary } from '#lib/catalog/film.js';
	import type { WorkKind } from '#lib/catalog/library.js';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import { formatDate } from '#lib/i18n/dates.js';
	import PublicListCard from '#lib/components/library/PublicListCard.svelte';
	import RatingDisplay from '#lib/components/library/RatingDisplay.svelte';
	import TmdbSetupNotice from '#lib/components/TmdbSetupNotice.svelte';
	import { chartName } from '#lib/i18n/charts.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const scale = $derived(data.user?.ratingScale ?? 'stars');

	type Row = {
		title: string;
		more?: string;
		works: (FilmSummary & { kind?: WorkKind })[];
	};

	const rows = $derived.by((): Row[] => {
		if (data.state !== 'ready') return [];
		return [
			{ title: m.films_popular(), more: resolve('/(app)/films'), works: data.films },
			{
				title: m.series_popular(),
				more: resolve('/(app)/series'),
				works: data.series.map((work) => ({ ...work, kind: 'series' as const }))
			},
			{
				title: data.watchlist.streaming ? m.home_watchlist_streaming() : m.home_watchlist(),
				more: resolve('/(app)/watchlist'),
				works: data.watchlist.works
			},
			{
				title: chartName('now-playing'),
				more: resolve('/(app)/lists/official/[chart]', { chart: 'now-playing' }),
				works: data.cinemas
			},
			{
				title: chartName('upcoming'),
				more: resolve('/(app)/lists/official/[chart]', { chart: 'upcoming' }),
				works: data.upcoming
			}
		].filter((row) => row.works.length > 0);
	});
</script>

<svelte:head>
	<title>Selfboxd</title>
</svelte:head>

<header class="welcome">
	<h1>{m.home_welcome({ username: data.user?.username ?? '' })}</h1>
	<p>{m.home_tagline()}</p>
</header>

{#if data.state === 'not_configured'}
	<TmdbSetupNotice isAdmin={data.user?.isAdmin ?? false} />
{/if}

{#each rows as row, index (row.title)}
	<section class:lead={index === 0}>
		<h2 class="section-title split-title">
			<span>{row.title}</span>
			{#if row.more}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved when the rows are built -->
				<a href={row.more}>{m.journal_more()}</a>
			{/if}
		</h2>
		<ul class="row">
			{#each row.works as work (`${work.kind ?? 'film'}:${String(work.id)}`)}
				<li><FilmPoster film={work} size="fill" /></li>
			{/each}
		</ul>
	</section>
{/each}

<div class="columns" class:single={data.state !== 'ready' || data.lists.length === 0}>
	<section>
		<h2 class="section-title split-title">
			<span>{m.home_recent()}</span>
			<a href={resolve('/(app)/diary')}>{m.journal_more()}</a>
		</h2>
		{#if data.recent.length === 0}
			<p class="empty">{m.home_empty_recent()}</p>
		{:else}
			<ul class="row recent">
				{#each data.recent as work, index (index)}
					<li>
						<FilmPoster film={work} size="fill" />
						{#if work.rating !== null}<RatingDisplay rating={work.rating} {scale} />{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if data.state === 'ready' && data.lists.length > 0}
		<section>
			<h2 class="section-title split-title">
				<span>{m.home_lists()}</span>
				<a href={resolve('/(app)/lists')}>{m.journal_more()}</a>
			</h2>
			<div class="lists">
				{#each data.lists as list (list.id)}
					<PublicListCard {list} target={{ list: list.id }} row />
				{/each}
			</div>
		</section>
	{/if}
</div>

{#if data.articles.length > 0}
	<section>
		<h2 class="section-title split-title">
			<span>{m.home_journal()}</span>
			<a href={resolve('/(app)/journal')}>{m.journal_more()}</a>
		</h2>
		<ul class="articles">
			{#each data.articles as article (article.id)}
				<li>
					<a href={article.url} target="_blank" rel="external noopener noreferrer">
						{#if article.imageUrl}
							<img src={article.imageUrl} alt="" loading="lazy" />
						{:else}
							<span class="blank"></span>
						{/if}
						<span class="meta">
							{#if article.category}<span>{article.category}</span>{/if}
							<time datetime={article.publishedAt}>
								{formatDate(new Date(article.publishedAt))}
							</time>
						</span>
						<span class="headline">{article.headline}</span>
						{#if article.subtitle}<span class="subtitle">{article.subtitle}</span>{/if}
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.welcome {
		padding: var(--space-8) 0 var(--space-12);
		text-align: center;
	}

	h1 {
		color: var(--color-text-strong);
		font-size: var(--font-size-hero);
		font-style: italic;
		line-height: 1.2;
	}

	.welcome p {
		margin-top: var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--font-size-prose);
	}

	section {
		margin-bottom: var(--space-12);
	}

	.row {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.lead .row {
		gap: var(--space-4);
	}

	.recent {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.recent li {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		color: var(--color-rating);
		font-size: var(--font-size-micro);
	}

	.split-title {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.split-title a {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	.split-title a:hover {
		color: var(--color-heading);
	}

	.columns {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: var(--space-12);
	}

	.columns.single {
		grid-template-columns: minmax(0, 1fr);
	}

	.single .recent {
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}

	.lists {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.articles {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--space-6);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.articles a {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.articles img,
	.blank {
		width: 100%;
		margin-bottom: var(--space-2);
		aspect-ratio: 16 / 9;
		border-radius: var(--radius-small);
		background: var(--color-panel);
		object-fit: cover;
		box-shadow: var(--shadow-poster);
	}

	.meta {
		display: flex;
		justify-content: space-between;
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.headline {
		color: var(--color-heading);
		font-family: var(--font-display);
		font-size: var(--font-size-large);
		font-weight: 900;
		line-height: 1.2;
	}

	.articles a:hover .headline {
		color: var(--color-link-hover);
	}

	.subtitle {
		color: var(--color-text);
		font-size: var(--font-size-control);
		line-height: var(--line-height-body);
	}

	.empty {
		color: var(--color-text-muted);
	}

	@media (max-width: 60rem) {
		.row {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}

		.row li:nth-child(n + 5) {
			display: none;
		}

		.recent li:nth-child(n + 5) {
			display: flex;
		}

		.columns,
		.articles {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	@media (max-width: 40rem) {
		.row {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.row li:nth-child(n + 4) {
			display: none;
		}

		.articles {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
