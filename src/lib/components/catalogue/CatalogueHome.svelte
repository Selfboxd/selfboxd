<script lang="ts">
	import { resolve } from '$app/paths';
	import { browseQuery, type Genre } from '#lib/catalog/browse.js';
	import type { FilmSummary } from '#lib/catalog/film.js';
	import type { WorkKind } from '#lib/catalog/library.js';
	import FilmBrowseBar from '#lib/components/film/FilmBrowseBar.svelte';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { browseRoute } from '#lib/paths.js';

	interface Props {
		kind: WorkKind;
		genres: Genre[];
		popular: FilmSummary[];
		rated: FilmSummary[];
		upcoming: FilmSummary[];
	}

	let { kind, genres, popular, rated, upcoming }: Props = $props();

	const id = $props.id();
	const title = $derived(kind === 'series' ? m.nav_series() : m.nav_films());
	const findLabel = $derived(kind === 'series' ? m.series_find() : m.films_find());
	const popularTitle = $derived(kind === 'series' ? m.series_popular() : m.films_popular());
</script>

<h1 class="sr-only">{title}</h1>
<div class="tools">
	<FilmBrowseBar {genres} {kind} />
	<form class="find" method="GET" action={resolve('/(app)/search')} role="search">
		<label for="{id}-find">{findLabel}</label>
		<input id="{id}-find" type="search" name="q" autocomplete="off" required />
		{#if kind === 'series'}<input type="hidden" name="type" value="series" />{/if}
	</form>
</div>

<section>
	<h2 class="section-title split-title">
		<span>{popularTitle}</span>
		<a href={resolve(browseRoute(kind))}>{m.journal_more()}</a>
	</h2>
	<ul class="large">
		{#each popular as work (work.id)}
			<li><FilmPoster film={{ ...work, kind }} size="large" /></li>
		{/each}
	</ul>
</section>

{#if rated.length > 0}
	<section>
		<h2 class="section-title split-title">
			<span>{m.films_top_rated()}</span>
			<a href="{resolve(browseRoute(kind))}?{browseQuery({ sort: 'rating' })}">
				{m.journal_more()}
			</a>
		</h2>
		<ul class="small">
			{#each rated as work (work.id)}
				<li><FilmPoster film={{ ...work, kind }} size="small" /></li>
			{/each}
		</ul>
	</section>
{/if}

{#if upcoming.length > 0}
	<section>
		<h2 class="section-title split-title">
			<span>{m.browse_upcoming()}</span>
			<a href="{resolve(browseRoute(kind))}?{browseQuery({ sort: 'upcoming' })}">
				{m.journal_more()}
			</a>
		</h2>
		<ul class="small">
			{#each upcoming as work (work.id)}
				<li><FilmPoster film={{ ...work, kind }} size="small" /></li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.tools {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-8);
	}

	.find {
		display: flex;
		gap: var(--space-3);
		align-items: center;
	}

	.find label {
		color: var(--color-text);
		font-size: var(--font-size-control);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.find input {
		width: 13rem;
		padding: var(--space-1) var(--space-2);
		border: 0;
		border-radius: var(--radius-small);
		background: var(--color-input);
		box-shadow: var(--shadow-input);
		color: var(--color-input-text);
		font: inherit;
	}

	.find input:focus {
		background: var(--color-input-focus);
		box-shadow: none;
		color: var(--color-input-focus-text);
		outline: none;
	}

	section {
		margin-bottom: var(--space-12);
	}

	.split-title {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.split-title a {
		color: inherit;
		font-size: var(--font-size-small);
	}

	.split-title a:hover {
		color: var(--color-link-hover);
	}

	ul {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.large {
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--space-3);
	}

	.small {
		grid-template-columns: repeat(12, minmax(0, 1fr));
		gap: var(--space-2);
	}

	ul :global(.poster) {
		width: 100%;
	}

	@media (max-width: 48rem) {
		.large {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.small {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
</style>
