<script lang="ts">
	import { resolve } from '$app/paths';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const path = $derived(resolve('/(app)/lists/[id]', { id: String(data.list.id) }));
</script>

<svelte:head>
	<title>{data.list.name} - Selfboxd</title>
</svelte:head>

<header>
	<h1>{data.list.name}</h1>
	<p class="meta">
		{#if data.list.owner}<span class="owner">{data.list.owner}</span>{/if}
		{#if data.list.itemCount !== null}
			<span>{m.list_count({ count: data.list.itemCount })}</span>
		{/if}
	</p>
</header>

{#if data.films.length === 0}
	<p>{m.catalogue_list_empty()}</p>
{:else}
	<ul>
		{#each data.films as film (film.id)}
			<li><FilmPoster {film} size="medium" /></li>
		{/each}
	</ul>
{/if}

{#if data.page > 1 || data.hasMore}
	<nav class="pages" aria-label={data.list.name}>
		{#if data.page > 1}
			<a class="button button-secondary" href="{path}?page={data.page - 1}">
				{m.search_previous()}
			</a>
		{/if}
		{#if data.hasMore}
			<a class="button button-secondary next" href="{path}?page={data.page + 1}">
				{m.search_next()}
			</a>
		{/if}
	</nav>
{/if}

<p class="credit">{m.catalogue_lists_credit()}</p>

<style>
	header {
		margin-bottom: var(--space-6);
		padding-bottom: var(--space-3);
		border-bottom: 1px solid var(--color-border);
	}

	h1 {
		font-family: var(--font-body);
		font-size: var(--font-size-title);
		font-weight: 700;
	}

	.meta {
		display: flex;
		gap: var(--space-3);
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--font-size-control);
	}

	.owner {
		color: var(--color-text);
		font-weight: 700;
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

	.credit {
		margin-top: var(--space-12);
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}
</style>
