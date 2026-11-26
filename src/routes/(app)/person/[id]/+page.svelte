<script lang="ts">
	import { toasts } from '#lib/components/toast/toasts.svelte.js';
	import PersonPhoto from '#lib/components/PersonPhoto.svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import AddToListDialog from '#lib/components/library/AddToListDialog.svelte';
	import WatchProgress from '#lib/components/library/WatchProgress.svelte';
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
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let expanded = $state(false);
	let adding = $state(false);

	/** Form action of the page keeping its options, so it applies to the works shown. */
	function action(name: string): string {
		const search = query({});
		return `?${search}${search ? '&' : ''}/${name}`;
	}

	$effect(() => {
		if ((page.form as { action?: string } | null | undefined)?.action === 'watchlist') {
			toasts.show(m.list_added_watchlist());
		}
	});

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

	function entry(label: string, change: Partial<PersonOptions>, current: boolean): FilterEntry {
		return { label, query: query(change), current };
	}

	const roleMenu = $derived(
		data.state === 'ready'
			? [
					{
						label: roleName(data.options.role),
						entries: data.roles.map((role) =>
							entry(
								`${roleName(role.role)} (${String(role.count)})`,
								{ role: role.role, decade: null, genre: null },
								data.options.role === role.role
							)
						)
					}
				]
			: []
	);

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
			...(data.services.length > 0
				? [
						{
							label:
								data.services.find((item) => item.id === options.service)?.name ??
								m.filter_service(),
							entries: [
								entry(m.filter_any_service(), { service: null }, options.service === null),
								...data.services.map((item) =>
									entry(item.name, { service: item.id }, options.service === item.id)
								)
							]
						}
					]
				: []),
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
	{#snippet link(item: FilterEntry)}
		<a
			href="{path}{item.query ? `?${item.query}` : ''}"
			aria-current={item.current ? 'true' : undefined}
		>
			{item.label}
		</a>
	{/snippet}

	<header class="head">
		<h1>
			<span class="kicker">{roleHeading(data.options.role)}</span>
			{person.name}
		</h1>
	</header>

	<div class="bar">
		<nav class="roles" aria-label={m.person_roles()}>
			<FilterMenus menus={roleMenu} {link} />
		</nav>
		<FilterMenus {menus} {link} />
	</div>

	<div class="person">
		<div class="main">
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
			<div class="photo">
				<PersonPhoto path={person.profilePath} name={person.name} size="w342" />
			</div>
			{#if person.birthday || person.deathday || person.placeOfBirth}
				<dl class="facts">
					{#if person.birthday || person.placeOfBirth}
						<dt>{m.person_born()}</dt>
						<dd>
							{#if person.birthday}{formatDate(new Date(person.birthday))}{/if}
							{#if person.birthday && person.placeOfBirth}<br />{/if}
							{person.placeOfBirth ?? ''}
						</dd>
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
			<p class="tmdb">
				{m.person_more_details()}
				<a
					href="https://www.themoviedb.org/person/{person.id}"
					target="_blank"
					rel="noopener noreferrer"
				>
					TMDB
				</a>
			</p>

			<div class="panel">
				<button type="button" onclick={() => (adding = true)} disabled={data.works.length === 0}>
					{m.person_add_to_list()}
				</button>
				<form method="POST" action={action('watchlist')} use:enhance>
					<button disabled={data.works.length === 0}>{m.list_add_all_watchlist()}</button>
				</form>
			</div>

			{#if data.progress}<WatchProgress progress={data.progress} />{/if}
		</aside>
	</div>

	<AddToListDialog
		bind:open={adding}
		action={action('list')}
		lists={data.lists}
		name="{person.name} - {roleName(data.options.role)}"
	/>
{/if}

<style>
	.head {
		margin-bottom: var(--space-4);
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
		margin-bottom: var(--space-1);
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-small);
		font-weight: 400;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-6);
		padding-bottom: var(--space-1);
		border-bottom: 1px solid var(--color-border);
	}

	.person {
		display: grid;
		grid-template-columns: minmax(0, 1fr) var(--sidebar-width);
		gap: var(--space-8);
		align-items: start;
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
		overflow: hidden;
		width: 100%;
		aspect-ratio: 2 / 3;
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

	.bio {
		font-size: var(--font-size-body);
	}

	.bio p {
		margin-bottom: var(--space-2);
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
		color: var(--color-text-strong);
		cursor: pointer;
		font: inherit;
	}

	.more:hover,
	.tmdb a:hover {
		color: var(--color-heading);
	}

	.tmdb {
		color: var(--color-text-muted);
	}

	.tmdb a {
		margin-inline-start: var(--space-1);
		padding: 0 var(--space-1);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-small);
		color: var(--color-text);
		font-size: var(--font-size-micro);
		letter-spacing: var(--letter-spacing-caps);
	}

	.panel {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-radius: var(--radius-medium);
		background: var(--color-surface-raised);
	}

	.panel button {
		display: block;
		width: 100%;
		padding: var(--space-3);
		border: 0;
		border-top: 1px solid var(--color-dialog-divider);
		background: none;
		color: var(--color-text-panel);
		font-family: inherit;
		font-size: var(--font-size-body);
		text-align: center;
		cursor: pointer;
	}

	.panel > :first-child,
	.panel > :first-child button {
		border-top: 0;
	}

	.panel button:hover:not(:disabled) {
		color: var(--color-heading);
	}

	.panel button:disabled {
		cursor: default;
		opacity: 0.5;
	}

	@media (max-width: 48rem) {
		.person {
			grid-template-columns: minmax(0, 1fr);
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

		.bar :global(.menus) {
			flex-wrap: wrap;
		}
	}
</style>
