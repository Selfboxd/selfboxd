<script lang="ts">
	import { resolve } from '$app/paths';
	import { browseQuery, type BrowseSort } from '#lib/catalog/browse.js';
	import FilmBrowseBar from '#lib/components/film/FilmBrowseBar.svelte';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import TmdbSetupNotice from '#lib/components/TmdbSetupNotice.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const sortLabels: Record<BrowseSort, () => string> = {
		popular: m.browse_popular,
		rating: m.browse_highest,
		rating_lowest: m.browse_lowest,
		name: m.browse_name,
		upcoming: m.browse_upcoming
	};

	const chips = $derived.by(() => {
		if (data.state !== 'ready') return [];
		const { filter, genres } = data;
		return [
			sortLabels[filter.sort](),
			...(filter.year ? [String(filter.year)] : []),
			...(filter.decade && !filter.year
				? [m.browse_decade({ decade: String(filter.decade) })]
				: []),
			...genres.filter((genre) => genre.id === filter.genre).map((genre) => genre.name)
		];
	});
</script>

<svelte:head>
	<title>{m.nav_films()} - Selfboxd</title>
</svelte:head>

{#if data.state === 'not_configured'}
	<TmdbSetupNotice isAdmin={data.user?.isAdmin ?? false} />
{:else if data.state === 'error'}
	<FormError message={errorMessage(data.error)} />
{:else}
	<div class="tools"><FilmBrowseBar genres={data.genres} filter={data.filter} /></div>

	<h1 class="section-title">
		{m.nav_films()}
		{#each chips as chip (chip)}<span class="chip">{chip}</span>{/each}
	</h1>

	{#if data.films.length === 0}
		<p>{m.browse_empty()}</p>
	{:else}
		<ul>
			{#each data.films as film (film.id)}
				<li><FilmPoster {film} size="medium" /></li>
			{/each}
		</ul>
	{/if}

	{#if data.totalPages > 1}
		<nav class="pages" aria-label={m.nav_films()}>
			{#if data.page > 1}
				<a
					class="button button-secondary"
					href="{resolve('/(app)/films/browse')}?{browseQuery({
						...data.filter,
						page: data.page - 1
					})}"
				>
					{m.search_previous()}
				</a>
			{/if}
			{#if data.page < data.totalPages}
				<a
					class="button button-secondary next"
					href="{resolve('/(app)/films/browse')}?{browseQuery({
						...data.filter,
						page: data.page + 1
					})}"
				>
					{m.search_next()}
				</a>
			{/if}
		</nav>
	{/if}
{/if}

<style>
	.tools {
		margin-bottom: var(--space-6);
	}

	.chip {
		margin-inline-start: var(--space-2);
		padding: 0 var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-chip);
		color: var(--color-text-strong);
		text-transform: none;
	}

	ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	ul :global(.poster) {
		width: 100%;
	}

	.pages {
		display: flex;
		margin-top: var(--space-6);
	}

	.pages .next {
		margin-inline-start: auto;
	}
</style>
