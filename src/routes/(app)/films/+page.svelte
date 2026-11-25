<script lang="ts">
	import { resolve } from '$app/paths';
	import { browseQuery } from '#lib/catalog/browse.js';
	import FilmBrowseBar from '#lib/components/film/FilmBrowseBar.svelte';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import TmdbSetupNotice from '#lib/components/TmdbSetupNotice.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const id = $props.id();
</script>

<svelte:head>
	<title>{m.nav_films()} - Selfboxd</title>
</svelte:head>

{#if data.state === 'not_configured'}
	<TmdbSetupNotice isAdmin={data.user?.isAdmin ?? false} />
{:else if data.state === 'error'}
	<FormError message={errorMessage(data.error)} />
{:else}
	<h1 class="sr-only">{m.nav_films()}</h1>
	<div class="tools">
		<FilmBrowseBar genres={data.genres} />
		<form class="find" method="GET" action={resolve('/(app)/search')} role="search">
			<label for="{id}-find">{m.films_find()}</label>
			<input id="{id}-find" type="search" name="q" autocomplete="off" required />
		</form>
	</div>

	<section>
		<h2 class="section-title split-title">
			<span>{m.films_popular()}</span>
			<a href={resolve('/(app)/films/browse')}>{m.journal_more()}</a>
		</h2>
		<ul class="large">
			{#each data.popular as film (film.id)}
				<li><FilmPoster {film} size="large" /></li>
			{/each}
		</ul>
	</section>

	{#if data.rated.length > 0}
		<section>
			<h2 class="section-title split-title">
				<span>{m.films_top_rated()}</span>
				<a href="{resolve('/(app)/films/browse')}?{browseQuery({ sort: 'rating' })}">
					{m.journal_more()}
				</a>
			</h2>
			<ul class="small">
				{#each data.rated as film (film.id)}
					<li><FilmPoster {film} size="small" /></li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.upcoming.length > 0}
		<section>
			<h2 class="section-title split-title">
				<span>{m.browse_upcoming()}</span>
				<a href="{resolve('/(app)/films/browse')}?{browseQuery({ sort: 'upcoming' })}">
					{m.journal_more()}
				</a>
			</h2>
			<ul class="small">
				{#each data.upcoming as film (film.id)}
					<li><FilmPoster {film} size="small" /></li>
				{/each}
			</ul>
		</section>
	{/if}
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
