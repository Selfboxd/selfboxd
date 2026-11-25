<script lang="ts">
	import FilmDetails from '#lib/components/film/FilmDetails.svelte';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import FilmWatch from '#lib/components/film/FilmWatch.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import TmdbSetupNotice from '#lib/components/TmdbSetupNotice.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { tmdbImage } from '#lib/images.js';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function formatCount(count: number): string {
		return new Intl.NumberFormat(getLocale()).format(count);
	}
</script>

<svelte:head>
	<title>{data.state === 'ready' ? data.film.title : m.nav_search()} - Selfboxd</title>
</svelte:head>

{#if data.state === 'not_configured'}
	<TmdbSetupNotice isAdmin={data.user?.isAdmin ?? false} />
{:else if data.state === 'error'}
	<FormError message={errorMessage(data.error)} />
{:else}
	{@const film = data.film}
	{#if film.backdropPath}
		<div class="backdrop">
			<img src={tmdbImage(film.backdropPath, 'w1280')} alt="" />
		</div>
	{/if}

	<div class="film" class:with-backdrop={film.backdropPath}>
		<aside class="side">
			<FilmPoster {film} size="large" linked={false} />
			<FilmWatch watch={film.watch} trailerKey={film.trailerKey} />
		</aside>

		<div class="main">
			<header>
				<h1>{film.title}</h1>
				<p class="byline">
					{#if film.year}<span class="year">{film.year}</span>{/if}
					{#if film.directors.length > 0}
						<span class="directed">
							{m.film_directed_by()}
							<span class="directors">
								{film.directors.map((person) => person.name).join(', ')}
							</span>
						</span>
					{/if}
				</p>
				{#if film.originalTitle !== film.title}
					<p class="original">{film.originalTitle}</p>
				{/if}
			</header>

			<div class="columns">
				<div class="text">
					{#if film.tagline}<p class="tagline">{film.tagline}</p>{/if}
					{#if film.overview}<p class="overview">{film.overview}</p>{/if}

					<FilmDetails {film} />

					<p class="footer">
						{#if film.runtime}<span>{m.film_runtime({ minutes: film.runtime })}</span>{/if}
						<span class="more-at">
							{m.film_more_at()}
							<a
								class="micro"
								href="https://www.themoviedb.org/movie/{film.id}"
								target="_blank"
								rel="noopener noreferrer"
							>
								TMDB
							</a>
						</span>
					</p>
				</div>

				<section class="ratings">
					<header class="ratings-header">
						<h2>{m.film_ratings()}</h2>
						{#if film.rating.count > 0}
							<span>{m.film_rating_count({ count: formatCount(film.rating.count) })}</span>
						{/if}
					</header>
					{#if film.rating.count > 0}
						<p class="average">{film.rating.average.toFixed(1)}<span>/10</span></p>
					{/if}
				</section>
			</div>
		</div>
	</div>

	{#if data.related && data.related.films.length > 0}
		<section class="related" aria-label={data.related.name}>
			<h2 class="section-title">{m.film_related()}</h2>
			<ul>
				{#each data.related.films as other (other.id)}
					<li><FilmPoster film={other} size="medium" /></li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}

<style>
	.backdrop {
		position: absolute;
		z-index: -1;
		top: calc(-1 * var(--header-height));
		left: 50%;
		overflow: hidden;
		width: min(100%, var(--backdrop-width));
		height: var(--backdrop-height);
		transform: translateX(-50%);
	}

	.backdrop img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center top;
	}

	.backdrop::after {
		position: absolute;
		background:
			var(--texture-grain),
			linear-gradient(
				to right,
				var(--color-background),
				var(--color-background-clear) 22%,
				var(--color-background-clear) 78%,
				var(--color-background)
			),
			linear-gradient(
				to bottom,
				var(--color-background-clear) 45%,
				var(--color-background-veil) 75%,
				var(--color-background)
			);
		content: '';
		inset: 0;
	}

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
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	h1 {
		display: inline;
		margin-inline-end: var(--space-2);
		font-size: var(--font-size-film-title);
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	.byline {
		display: inline;
		color: var(--color-text-strong);
		font-size: var(--font-size-large);
	}

	.year {
		margin-inline-end: var(--space-2);
	}

	.directors {
		color: var(--color-heading);
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

	.related {
		margin-top: var(--space-12);
	}

	.related ul {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	@media (max-width: 48rem) {
		.film,
		.columns {
			grid-template-columns: minmax(0, 1fr);
		}

		.side {
			max-width: var(--poster-large);
		}
	}
</style>
