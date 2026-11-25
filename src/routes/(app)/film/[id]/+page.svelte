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
			<FilmWatch watch={film.watch} />
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
						{#if film.trailerKey}
							<a
								href="https://www.youtube.com/watch?v={film.trailerKey}"
								target="_blank"
								rel="noopener noreferrer"
							>
								{m.film_trailer()}
							</a>
						{/if}
					</p>
				</div>

				<section class="ratings">
					<h2 class="section-title">{m.film_ratings()}</h2>
					{#if film.rating.count > 0}
						<p class="average">{film.rating.average.toFixed(1)}<span>/10</span></p>
						<p class="count">{m.film_rating_count({ count: formatCount(film.rating.count) })}</p>
					{/if}
				</section>
			</div>
		</div>
	</div>

	{#if data.related && data.related.films.length > 0}
		<section class="related">
			<h2 class="section-title">{data.related.name}</h2>
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
		top: 0;
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
		object-position: center 20%;
	}

	.backdrop::after {
		position: absolute;
		background:
			linear-gradient(
				to right,
				var(--color-background),
				transparent 20%,
				transparent 80%,
				var(--color-background)
			),
			linear-gradient(to bottom, transparent 30%, var(--color-background) 95%);
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
		gap: var(--space-4);
	}

	h1 {
		display: inline;
		font-size: var(--font-size-film-title);
		font-weight: 700;
	}

	.byline {
		display: inline;
		margin-inline-start: var(--space-2);
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
		gap: var(--space-8);
		margin-top: var(--space-6);
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
	}

	.footer {
		display: flex;
		gap: var(--space-4);
		margin-top: var(--space-6);
		font-size: var(--font-size-small);
	}

	.average {
		color: var(--color-heading);
		font-size: var(--font-size-title);
		font-weight: 300;
	}

	.average span {
		color: var(--color-text);
		font-size: var(--font-size-body);
	}

	.count {
		font-size: var(--font-size-small);
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
