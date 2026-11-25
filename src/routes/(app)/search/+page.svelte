<script lang="ts">
	import { resolve } from '$app/paths';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import TmdbSetupNotice from '#lib/components/TmdbSetupNotice.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.nav_search()} - Selfboxd</title>
</svelte:head>

{#if data.state === 'not_configured'}
	<TmdbSetupNotice isAdmin={data.user?.isAdmin ?? false} />
{:else if data.state === 'error'}
	<FormError message={errorMessage(data.error)} />
{:else if !data.query}
	<p class="empty">{m.search_prompt()}</p>
{:else}
	<h1 class="section-title">{m.search_heading({ query: data.query })}</h1>
	{#if data.films.length === 0}
		<p class="empty">{m.search_empty()}</p>
	{:else}
		<ul class="results">
			{#each data.films as film (film.id)}
				<li>
					<FilmPoster {film} size="small" />
					<h2>
						<a href={resolve('/(app)/film/[id]', { id: String(film.id) })}>{film.title}</a>
						{#if film.year}<span class="year">{film.year}</span>{/if}
					</h2>
				</li>
			{/each}
		</ul>
	{/if}
{/if}

<style>
	.empty {
		color: var(--color-text);
	}

	.results {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.results li {
		display: flex;
		gap: var(--space-4);
		align-items: flex-start;
		padding: var(--space-4) 0;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	h2 {
		font-size: var(--font-size-heading);
		font-weight: 700;
	}

	h2 a {
		color: var(--color-heading);
	}

	h2 a:hover {
		color: var(--color-link-hover);
	}

	.year {
		margin-inline-start: var(--space-1);
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-large);
		font-weight: 300;
	}
</style>
