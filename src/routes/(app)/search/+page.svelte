<script lang="ts">
	import { resolve } from '$app/paths';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import TmdbSetupNotice from '#lib/components/TmdbSetupNotice.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function pageQuery(page: number): string {
		return new URLSearchParams({ q: data.query, page: String(page) }).toString();
	}
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
	<div class="layout">
		<section>
			<h1 class="section-title">{m.search_heading({ query: data.query })}</h1>
			{#if data.films.length === 0}
				<p class="empty">{m.search_empty()}</p>
			{:else}
				<ul class="results">
					{#each data.films as film (film.id)}
						<li>
							<FilmPoster {film} size="small" />
							<div class="details">
								<h2>
									<a href={resolve('/(app)/film/[id]', { id: String(film.id) })}>{film.title}</a>
									{#if film.year}<span class="year">{film.year}</span>{/if}
								</h2>
								{#if film.originalTitle !== film.title}
									<p class="meta">{m.film_original_title()}: {film.originalTitle}</p>
								{/if}
								{#if film.directors.length > 0}
									<p class="meta directed">
										{m.film_directed_by()}
										{#each film.directors as director (director.id)}
											<span class="chip">{director.name}</span>
										{/each}
									</p>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
				{#if data.totalPages > 1}
					<nav class="pages" aria-label={m.nav_search()}>
						{#if data.page > 1}
							<a
								class="button button-secondary"
								href="{resolve('/(app)/search')}?{pageQuery(data.page - 1)}"
							>
								{m.search_previous()}
							</a>
						{/if}
						{#if data.page < data.totalPages}
							<a
								class="button button-secondary next"
								href="{resolve('/(app)/search')}?{pageQuery(data.page + 1)}"
							>
								{m.search_next()}
							</a>
						{/if}
					</nav>
				{/if}
			{/if}
		</section>

		<aside>
			<h2 class="section-title">{m.search_filter_title()}</h2>
			<ul class="filters">
				<li><span aria-current="true">{m.search_section_films()}</span></li>
			</ul>
		</aside>
	</div>
{/if}

<style>
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) var(--sidebar-width);
		gap: var(--space-12);
		align-items: start;
	}

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
		gap: var(--space-6);
		align-items: flex-start;
		padding: var(--space-4) 0;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.results li:first-child {
		padding-top: var(--space-1);
	}

	.details {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: var(--space-2);
	}

	h2:not(.section-title) {
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

	.meta {
		color: var(--color-text);
	}

	.directed {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		align-items: center;
	}

	.chip {
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-chip);
		box-shadow: var(--shadow-chip);
		font-size: var(--font-size-control);
	}

	.pages {
		display: flex;
		margin-top: var(--space-6);
	}

	.pages .next {
		margin-inline-start: auto;
	}

	.pages a:hover {
		color: var(--color-heading);
	}

	.filters {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.filters span {
		display: block;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-small);
	}

	.filters [aria-current='true'] {
		background: var(--color-panel);
		color: var(--color-heading);
		font-weight: 700;
	}

	@media (max-width: 48rem) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
