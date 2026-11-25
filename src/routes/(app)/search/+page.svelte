<script lang="ts">
	import { resolve } from '$app/paths';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import PublicListCard from '#lib/components/library/PublicListCard.svelte';
	import { workRoute } from '#lib/paths.js';
	import TmdbSetupNotice from '#lib/components/TmdbSetupNotice.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Section = 'all' | 'films' | 'series' | 'lists';

	const section = $derived.by((): Section => {
		if (data.state === 'lists' || data.state === 'lists_error') return 'lists';
		if (data.state !== 'ready') return 'all';
		return data.scope === 'film' ? 'films' : data.scope === 'series' ? 'series' : 'all';
	});

	function sectionQuery(target: Section, page = 1): string {
		const type = target === 'all' ? {} : { type: target };
		const pages = page > 1 ? { page: String(page) } : {};
		return new URLSearchParams({ q: data.query, ...type, ...pages }).toString();
	}

	const sections = $derived([
		{ id: 'all' as const, label: m.search_section_all() },
		{ id: 'films' as const, label: m.search_section_films() },
		{ id: 'series' as const, label: m.search_section_series() },
		...(data.hasLists ? [{ id: 'lists' as const, label: m.search_section_lists() }] : [])
	]);
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
			{#if data.state === 'lists_error'}
				<FormError message={m.catalogue_lists_unavailable()} />
			{:else if data.state === 'lists'}
				{#if data.lists.length === 0}
					<p class="empty">{m.catalogue_lists_empty()}</p>
				{:else}
					<div class="lists">
						{#each data.lists as list (list.id)}
							<PublicListCard {list} target={{ list: list.id }} row />
						{/each}
					</div>
				{/if}
			{:else if data.results.length === 0}
				<p class="empty">{m.search_empty()}</p>
			{:else}
				<ul class="results">
					{#each data.results as result (`${result.kind}:${String(result.id)}`)}
						<li>
							<FilmPoster film={result} size="small" />
							<div class="details">
								<h2>
									<a href={resolve(workRoute(result.kind), { id: String(result.id) })}>
										{result.title}
									</a>
									{#if result.year}<span class="year">{result.year}</span>{/if}
								</h2>
								{#if result.originalTitle !== result.title}
									<p class="meta">{m.film_original_title()}: {result.originalTitle}</p>
								{/if}
								{#if result.alternativeTitles.length > 0}
									<p class="meta alternative">
										{m.search_alternative_titles()}
										{result.alternativeTitles.join(', ')}
									</p>
								{/if}
								{#if result.people.length > 0}
									<p class="meta directed">
										{result.kind === 'series' ? m.series_created_by() : m.film_directed_by()}
										{#each result.people as person (person.id)}
											<span class="chip">{person.name}</span>
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
								href="{resolve('/(app)/search')}?{sectionQuery(section, data.page - 1)}"
							>
								{m.search_previous()}
							</a>
						{/if}
						{#if data.page < data.totalPages}
							<a
								class="button button-secondary next"
								href="{resolve('/(app)/search')}?{sectionQuery(section, data.page + 1)}"
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
				{#each sections as item (item.id)}
					<li>
						<a
							href="{resolve('/(app)/search')}?{sectionQuery(item.id)}"
							aria-current={section === item.id ? 'true' : undefined}
						>
							{item.label}
						</a>
					</li>
				{/each}
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

	.alternative {
		color: var(--color-text-muted);
		font-size: var(--font-size-control);
		overflow-wrap: anywhere;
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

	.lists {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.filters a {
		display: block;
		color: var(--color-text);
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
