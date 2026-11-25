<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		personQuery,
		type PersonKind,
		type PersonOptions,
		type PersonSort
	} from '#lib/catalog/person.js';
	import type { ListVisibility } from '#lib/catalog/list-view.js';
	import FilterMenus from '#lib/components/FilterMenus.svelte';
	import type { FilterEntry } from '#lib/components/filter-menus.js';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import TmdbSetupNotice from '#lib/components/TmdbSetupNotice.svelte';
	import { formatDate } from '#lib/i18n/dates.js';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { roleHeading, roleName } from '#lib/i18n/person.js';
	import { tmdbImage } from '#lib/images.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let expanded = $state(false);

	const sortLabels: Record<PersonSort, () => string> = {
		popular: m.browse_sort_popular,
		newest: m.list_sort_newest,
		oldest: m.list_sort_oldest,
		name: m.list_sort_name,
		rating: m.browse_sort_highest
	};

	const kindLabels: Record<PersonKind, () => string> = {
		all: m.person_kind_all,
		film: m.nav_films,
		series: m.nav_series
	};

	const visibilityLabels: Record<ListVisibility, () => string> = {
		all: m.list_show_all,
		unwatched: m.list_show_unwatched,
		watched: m.list_show_watched
	};

	/** Length of a biography beyond which only its start is shown until expanded. */
	const bioPreview = 400;

	const paragraphs = $derived(
		data.state === 'ready'
			? data.person.biography.split(/\n+/).filter((paragraph) => paragraph.trim() !== '')
			: []
	);

	function query(change: Partial<PersonOptions>): string {
		if (data.state !== 'ready') return '';
		return personQuery({ ...data.options, ...change }, data.fallback);
	}

	function href(change: Partial<PersonOptions>): string {
		const search = query(change);
		return search ? `?${search}` : '';
	}

	function entry(label: string, change: Partial<PersonOptions>, current: boolean): FilterEntry {
		return { label, query: query(change), current };
	}

	const menus = $derived.by(() => {
		if (data.state !== 'ready') return [];
		const { options, decades, genres } = data;
		const genre = genres.find((item) => item.id === options.genre);
		return [
			{
				label: options.kind === 'all' ? m.person_kind() : kindLabels[options.kind](),
				entries: (Object.keys(kindLabels) as PersonKind[]).map((kind) =>
					entry(kindLabels[kind](), { kind }, options.kind === kind)
				)
			},
			{
				label:
					options.decade === null
						? m.list_decade()
						: m.browse_decade({ decade: String(options.decade) }),
				entries: [
					entry(m.list_any_decade(), { decade: null }, options.decade === null),
					...decades.map((decade) =>
						entry(
							m.browse_decade({ decade: String(decade) }),
							{ decade },
							options.decade === decade
						)
					)
				]
			},
			{
				label: genre?.name ?? m.list_genre(),
				entries: [
					entry(m.list_any_genre(), { genre: null }, options.genre === null),
					...genres.map((item) => entry(item.name, { genre: item.id }, options.genre === item.id))
				]
			},
			{
				label: `${m.list_sort_by()} ${sortLabels[options.sort]()}`,
				entries: (Object.keys(sortLabels) as PersonSort[]).map((sort) =>
					entry(sortLabels[sort](), { sort }, options.sort === sort)
				)
			},
			{
				label: m.list_visibility(),
				icon: 'eye' as const,
				entries: (Object.keys(visibilityLabels) as ListVisibility[]).map((show) =>
					entry(visibilityLabels[show](), { show }, options.show === show)
				)
			}
		];
	});
</script>

<svelte:head>
	<title>{data.state === 'ready' ? data.person.name : m.person_title()} - Selfboxd</title>
</svelte:head>

{#if data.state === 'not_configured'}
	<TmdbSetupNotice isAdmin={data.user?.isAdmin ?? false} />
{:else if data.state === 'error'}
	<FormError message={errorMessage(data.error)} />
{:else}
	{@const person = data.person}
	{@const path = resolve('/(app)/person/[id]', { id: String(person.id) })}
	<div class="person">
		<div class="main">
			<header class="head">
				<h1>
					<span class="kicker">{roleHeading(data.options.role)}</span>
					{person.name}
				</h1>
				<nav class="roles" aria-label={m.person_roles()}>
					<ul>
						{#each data.roles as role (role.role)}
							<li>
								<a
									href="{path}{href({ role: role.role, decade: null, genre: null })}"
									aria-current={data.options.role === role.role ? 'page' : undefined}
								>
									{roleName(role.role)}
									<span class="count">{role.count}</span>
								</a>
							</li>
						{/each}
					</ul>
				</nav>
			</header>

			<div class="filters">
				<FilterMenus {menus}>
					{#snippet link(item: FilterEntry)}
						<a
							href="{path}{item.query ? `?${item.query}` : ''}"
							aria-current={item.current ? 'true' : undefined}
						>
							{item.label}
						</a>
					{/snippet}
				</FilterMenus>
			</div>

			{#if data.works.length === 0}
				<p class="empty">{m.person_empty()}</p>
			{:else}
				<ul class="grid">
					{#each data.works as work (`${work.kind}:${String(work.id)}`)}
						<li class:watched={work.watched} title={work.character || undefined}>
							<FilmPoster film={work} size="medium" />
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<aside class="side">
			{#if person.profilePath}
				<img
					class="photo"
					src={tmdbImage(person.profilePath, 'w342')}
					alt={person.name}
					loading="lazy"
				/>
			{/if}
			{#if person.birthday || person.deathday || person.placeOfBirth}
				<dl class="facts">
					{#if person.birthday}
						<dt>{m.person_born()}</dt>
						<dd>
							{formatDate(new Date(person.birthday))}{#if person.placeOfBirth}<br
								/>{person.placeOfBirth}{/if}
						</dd>
					{:else if person.placeOfBirth}
						<dt>{m.person_born()}</dt>
						<dd>{person.placeOfBirth}</dd>
					{/if}
					{#if person.deathday}
						<dt>{m.person_died()}</dt>
						<dd>{formatDate(new Date(person.deathday))}</dd>
					{/if}
				</dl>
			{/if}
			{#if paragraphs.length > 0}
				<div class="bio">
					{#each expanded ? paragraphs : paragraphs.slice(0, 1) as paragraph, index (index)}
						<p class:clamped={!expanded}>{paragraph}</p>
					{/each}
					{#if paragraphs.length > 1 || (paragraphs[0]?.length ?? 0) > bioPreview}
						<button class="more" onclick={() => (expanded = !expanded)}>
							{expanded ? m.person_less() : m.person_more()}
						</button>
					{/if}
				</div>
			{/if}
			<a
				class="tmdb"
				href="https://www.themoviedb.org/person/{person.id}"
				target="_blank"
				rel="noopener noreferrer"
			>
				{m.person_tmdb()}
			</a>
		</aside>
	</div>
{/if}

<style>
	.person {
		display: grid;
		grid-template-columns: minmax(0, 1fr) var(--sidebar-width);
		gap: var(--space-8);
		align-items: start;
	}

	.head {
		margin-bottom: var(--space-4);
	}

	.filters {
		display: flex;
		justify-content: flex-end;
		margin-bottom: var(--space-3);
	}

	h1 {
		color: var(--color-heading);
		font-family: var(--font-display);
		font-size: var(--font-size-title);
		font-weight: 700;
		line-height: 1.1;
	}

	.kicker {
		display: block;
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-small);
		font-weight: 400;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.roles {
		margin-top: var(--space-3);
		border-bottom: 1px solid var(--color-border);
	}

	.roles ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0 var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.roles a {
		display: inline-block;
		margin-bottom: -1px;
		padding: var(--space-1) 0;
		border-bottom: 1px solid transparent;
		color: var(--color-text);
		font-size: var(--font-size-control);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.roles a:hover {
		color: var(--color-heading);
	}

	.roles a[aria-current] {
		border-bottom-color: var(--color-accent);
		color: var(--color-heading);
	}

	.roles .count {
		color: var(--color-text-muted);
	}

	.empty {
		color: var(--color-text);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--poster-browse), 1fr));
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.grid :global(.poster) {
		width: 100%;
	}

	.grid .watched :global(.poster img) {
		opacity: 0.5;
		transition: opacity var(--duration-fast);
	}

	.grid .watched:hover :global(.poster img) {
		opacity: 1;
	}

	.side {
		display: grid;
		gap: var(--space-4);
		color: var(--color-text);
		font-size: var(--font-size-small);
	}

	.photo {
		width: 100%;
		border-radius: var(--radius-medium);
		box-shadow: var(--shadow-poster);
	}

	.facts {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--space-1) var(--space-3);
		margin: 0;
	}

	.facts dt {
		color: var(--color-text-muted);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.facts dd {
		margin: 0;
		color: var(--color-text-strong);
	}

	.bio p {
		margin-bottom: var(--space-3);
		line-height: 1.6;
	}

	.clamped {
		display: -webkit-box;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 8;
		line-clamp: 8;
	}

	.more {
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-text-muted);
		cursor: pointer;
		font: inherit;
	}

	.more:hover,
	.tmdb:hover {
		color: var(--color-heading);
	}

	.tmdb {
		color: var(--color-text-muted);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	@media (max-width: 48rem) {
		.person {
			grid-template-columns: minmax(0, 1fr);
		}

		.filters {
			justify-content: flex-start;
		}

		.filters :global(.menus) {
			flex-wrap: wrap;
		}

		.main {
			display: contents;
		}

		.head {
			order: -2;
		}

		.side {
			order: -1;
			grid-template-columns: var(--avatar-large) minmax(0, 1fr);
		}

		.side > :not(.photo) {
			grid-column: 2;
		}

		.photo {
			grid-row: span 3;
		}
	}
</style>
