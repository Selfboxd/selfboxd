<script lang="ts">
	import PersonPhoto from '#lib/components/PersonPhoto.svelte';
	import { resolve } from '$app/paths';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import RatingDisplay from '#lib/components/library/RatingDisplay.svelte';
	import type { DiaryEntry, ListSummary, TagCount } from '#lib/catalog/library.js';
	import { formatDate } from '#lib/i18n/dates.js';
	import FormError from '#lib/components/FormError.svelte';
	import LoadMore from '#lib/components/LoadMore.svelte';
	import { InfinitePages } from '#lib/components/infinite.svelte.js';
	import type { SearchResult } from '#lib/catalog/search.js';
	import PublicListCard from '#lib/components/library/PublicListCard.svelte';
	import { workRoute } from '#lib/paths.js';
	import TmdbSetupNotice from '#lib/components/TmdbSetupNotice.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { roleName } from '#lib/i18n/person.js';
	import { departmentRole } from '#lib/catalog/person.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const pages = new InfinitePages<SearchResult>(
		() =>
			data.state === 'ready'
				? { items: data.results, page: data.page, more: data.page < data.totalPages }
				: { items: [], page: 1, more: false },
		(loaded) => {
			const next = loaded as Partial<{ results: SearchResult[]; page: number; totalPages: number }>;
			return next.results && next.page !== undefined && next.totalPages !== undefined
				? { items: next.results, page: next.page, more: next.page < next.totalPages }
				: null;
		},
		(result) => `${result.kind}:${String(result.id)}`
	);

	type Section =
		'all' | 'films' | 'series' | 'people' | 'your-lists' | 'reviews' | 'tags' | 'journal' | 'lists';

	const section = $derived.by((): Section => {
		if (data.state === 'lists' || data.state === 'lists_error') return 'lists';
		if (data.state === 'own_lists') return 'your-lists';
		if (data.state === 'reviews' || data.state === 'tags') return data.state;
		if (data.state === 'journal' || data.state === 'journal_error') return 'journal';
		if (data.state !== 'ready') return 'all';
		const sections = { all: 'all', film: 'films', series: 'series', person: 'people' } as const;
		return sections[data.scope];
	});

	function sectionQuery(target: Section): string {
		const type = target === 'all' ? {} : { type: target };
		return new URLSearchParams({ q: data.query, ...type }).toString();
	}

	const sections = $derived([
		{ id: 'all' as const, label: m.search_section_all() },
		{ id: 'films' as const, label: m.search_section_films() },
		{ id: 'series' as const, label: m.search_section_series() },
		{ id: 'people' as const, label: m.search_section_people() },
		{ id: 'your-lists' as const, label: m.search_section_own_lists() },
		{ id: 'reviews' as const, label: m.search_section_reviews() },
		{ id: 'tags' as const, label: m.search_section_tags() },
		{ id: 'journal' as const, label: m.search_section_journal() },
		...(data.hasLists ? [{ id: 'lists' as const, label: m.search_section_public_lists() }] : [])
	]);

	const scale = $derived(data.user?.ratingScale ?? 'stars');

	function tagQuery(name: string): string {
		return new URLSearchParams({ tag: name }).toString();
	}

	function excerpt(text: string): string {
		return text.length > excerptLength ? `${text.slice(0, excerptLength).trimEnd()}…` : text;
	}

	const excerptLength = 220;
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
			{#if data.state === 'reviews'}
				{#if data.reviews.length === 0}
					<p class="empty">{m.log_search_empty()}</p>
				{:else}
					<ul class="results">
						{#each data.reviews as entry (entry.id)}
							<li>{@render review(entry)}</li>
						{/each}
					</ul>
				{/if}
			{:else if data.state === 'own_lists'}
				{#if data.ownLists.length === 0}
					<p class="empty">{m.log_search_empty()}</p>
				{:else}
					<ul class="results">
						{#each data.ownLists as list (list.id)}
							<li>{@render ownList(list)}</li>
						{/each}
					</ul>
				{/if}
			{:else if data.state === 'tags'}
				{#if data.tags.length === 0}
					<p class="empty">{m.log_search_empty()}</p>
				{:else}
					<ul class="tags">
						{#each data.tags as tag (tag.name)}
							<li>{@render tagChip(tag)}</li>
						{/each}
					</ul>
				{/if}
			{:else if data.state === 'journal_error'}
				<FormError message={m.journal_unavailable()} />
			{:else if data.state === 'journal'}
				{#if data.articles.length === 0}
					<p class="empty">{m.log_search_empty()}</p>
				{:else}
					<ul class="results">
						{#each data.articles as article (article.id)}
							<li class="article">
								<div class="details">
									<h2>
										<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- article of the journal feed -->
										<a href={article.url} rel="noopener noreferrer" target="_blank">
											{article.headline}
										</a>
									</h2>
									{#if article.subtitle}<p class="meta">{article.subtitle}</p>{/if}
									<p class="meta">
										{#if article.category}{article.category} ·{/if}
										{formatDate(new Date(article.publishedAt))}
									</p>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			{:else if data.state === 'lists_error'}
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
			{:else}
				{#if data.broadened}
					<p class="notice">
						{m.search_broadened({ query: data.query, broader: data.broadened })}
					</p>
				{/if}
				{#if pages.items.length === 0}
					<p class="empty">{m.search_empty()}</p>
					{#if data.suggestions.length > 0}
						<h2 class="group-title suggestions-title">{m.search_suggestions()}</h2>
						<ul class="suggestions">
							{#each data.suggestions as film (film.id)}
								<li><FilmPoster {film} size="small" /></li>
							{/each}
						</ul>
					{/if}
				{:else}
					<ul class="results">
						{#each pages.items as result (`${result.kind}:${String(result.id)}`)}
							{#if result.kind === 'person'}
								{@const role = departmentRole(result.department)}
								<li>
									<a
										class="photo"
										href={resolve('/(app)/person/[id]', { id: String(result.id) })}
										tabindex="-1"
										aria-hidden="true"
									>
										<PersonPhoto path={result.profilePath} name={result.name} size="w154" />
									</a>
									<div class="details">
										<h2>
											<a href={resolve('/(app)/person/[id]', { id: String(result.id) })}>
												{result.name}
											</a>
										</h2>
										{#if role}<p class="meta">{roleName(role)}</p>{/if}
										{#if result.knownFor.length > 0}
											<p class="meta">{m.search_known_for()} {result.knownFor.join(', ')}</p>
										{/if}
									</div>
								</li>
							{:else}
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
													<a
														class="chip"
														href={resolve('/(app)/person/[id]', { id: String(person.id) })}
													>
														{person.name}
													</a>
												{/each}
											</p>
										{/if}
									</div>
								</li>
							{/if}
						{/each}
					</ul>
					<LoadMore more={pages.more} loading={pages.loading} onmore={() => void pages.next()} />
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
			{#if data.state !== 'reviews' && data.library && (data.library.lists.length > 0 || data.library.reviews.length > 0 || data.library.tags.length > 0)}
				{@const library = data.library}
				<section class="library" aria-label={m.search_library()}>
					{#if library.lists.length > 0}
						<div class="group">
							<h2 class="group-title">
								{m.search_section_own_lists()}
								<a href="{resolve('/(app)/search')}?{sectionQuery('your-lists')}">
									{m.search_see_all()}
								</a>
							</h2>
							<ul class="mini">
								{#each library.lists as list (list.id)}
									<li>
										<a href={resolve('/(app)/profile/lists/[id]', { id: String(list.id) })}>
											{list.name}
										</a>
										<span>{m.list_count({ count: list.count })}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if library.reviews.length > 0}
						<div class="group">
							<h2 class="group-title">
								{m.search_section_reviews()}
								<a href="{resolve('/(app)/search')}?{sectionQuery('reviews')}">
									{m.search_see_all()}
								</a>
							</h2>
							<ul class="mini">
								{#each library.reviews as entry (entry.id)}
									<li>
										<a href={resolve('/(app)/reviews/[id]', { id: String(entry.id) })}>
											{entry.work.title}
										</a>
										{#if entry.rating !== null}<RatingDisplay rating={entry.rating} {scale} />{/if}
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if library.tags.length > 0}
						<div class="group">
							<h2 class="group-title">
								{m.search_section_tags()}
								<a href="{resolve('/(app)/search')}?{sectionQuery('tags')}">
									{m.search_see_all()}
								</a>
							</h2>
							<ul class="tags">
								{#each library.tags as tag (tag.name)}
									<li>{@render tagChip(tag)}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</section>
			{/if}
		</aside>
	</div>
{/if}

{#snippet review(entry: DiaryEntry)}
	<FilmPoster film={{ ...entry.work, id: entry.work.externalId }} size="small" />
	<div class="details">
		<h2>
			<a href={resolve('/(app)/reviews/[id]', { id: String(entry.id) })}>{entry.work.title}</a>
			{#if entry.work.year}<span class="year">{entry.work.year}</span>{/if}
		</h2>
		<p class="meta">
			{#if entry.rating !== null}<RatingDisplay rating={entry.rating} {scale} />{/if}
			{m.activity_watched_on({ date: formatDate(new Date(entry.watchedOn)) })}
		</p>
		<p class="excerpt">
			{entry.containsSpoilers ? m.review_spoiler_notice() : excerpt(entry.review)}
		</p>
	</div>
{/snippet}

{#snippet ownList(list: ListSummary)}
	<span class="stack">
		{#each list.preview.slice(0, 3) as work (work.id)}
			<FilmPoster film={{ ...work, id: work.externalId }} size="tiny" linked={false} />
		{/each}
	</span>
	<div class="details">
		<h2>
			<a href={resolve('/(app)/profile/lists/[id]', { id: String(list.id) })}>{list.name}</a>
		</h2>
		<p class="meta">{m.list_count({ count: list.count })}</p>
		{#if list.description}<p class="excerpt">{excerpt(list.description)}</p>{/if}
	</div>
{/snippet}

{#snippet tagChip(tag: TagCount)}
	<a class="tag" href="{resolve('/(app)/diary')}?{tagQuery(tag.name)}">
		{tag.name}
		<span>{m.search_tag_count({ count: tag.count })}</span>
	</a>
{/snippet}

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

	.notice {
		margin-bottom: var(--space-4);
		color: var(--color-text);
		font-size: var(--font-size-control);
	}

	.suggestions-title {
		margin-top: var(--space-8);
	}

	.suggestions {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--poster-small), 1fr));
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.library {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		margin-top: var(--space-8);
	}

	.mini {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--font-size-control);
	}

	.mini li {
		display: flex;
		gap: var(--space-2);
		align-items: baseline;
		justify-content: space-between;
	}

	.mini a {
		overflow: hidden;
		color: var(--color-text-strong);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mini a:hover {
		color: var(--color-link-hover);
	}

	.mini span,
	.mini :global(.rating) {
		flex-shrink: 0;
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	.group-title {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: var(--space-2);
		padding-bottom: var(--space-1);
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-small);
		font-weight: 400;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.group-title a {
		color: var(--color-text-muted);
	}

	.group-title a:hover {
		color: var(--color-heading);
	}

	.excerpt {
		color: var(--color-text);
		font-size: var(--font-size-body);
		line-height: var(--line-height-body);
		overflow-wrap: anywhere;
	}

	.stack {
		display: flex;
		flex: none;
		width: var(--poster-small);
	}

	.stack > :global(*:not(:first-child)) {
		margin-inline-start: calc(-1 * var(--space-4));
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.tag {
		display: inline-flex;
		gap: var(--space-2);
		align-items: baseline;
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-small);
		background: var(--color-chip);
		box-shadow: var(--shadow-chip);
		color: var(--color-text-strong);
		font-size: var(--font-size-control);
	}

	.tag span {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	.tag:hover {
		color: var(--color-heading);
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

	.photo {
		overflow: hidden;
		flex: none;
		width: var(--poster-small);
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--color-chip);
		box-shadow: var(--shadow-poster);
	}

	.details {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: var(--space-2);
	}

	h2:not(.section-title, .group-title) {
		font-size: var(--font-size-heading);
		font-weight: 700;
	}

	.details h2 a {
		color: var(--color-heading);
	}

	.details h2 a:hover {
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
		color: var(--color-text-strong);
		font-size: var(--font-size-control);
	}

	.chip:hover {
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
