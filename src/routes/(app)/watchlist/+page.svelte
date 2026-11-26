<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import {
		watchlistQuery,
		type WatchlistOptions,
		type WatchlistSort
	} from '#lib/catalog/watchlist-view.js';
	import type { WorkSearchResult } from '#lib/catalog/search.js';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import FilterMenus from '#lib/components/FilterMenus.svelte';
	import FormNotice from '#lib/components/FormNotice.svelte';
	import type { FilterEntry, FilterMenu } from '#lib/components/filter-menus.js';
	import Icon from '#lib/components/Icon.svelte';
	import WorkSearchDialog from '#lib/components/library/WorkSearchDialog.svelte';
	import ProfileNav from '#lib/components/profile/ProfileNav.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let searching = $state(false);
	let confirming = $state(false);
	let addForm: HTMLFormElement | undefined = $state();
	let picked = $state<{ kind: string; id: string } | null>(null);

	const sortLabels: Record<WatchlistSort, () => string> = {
		added: m.watchlist_sort_added,
		added_oldest: m.watchlist_sort_added_oldest,
		release: m.diary_sort_release,
		release_oldest: m.diary_sort_release_oldest,
		name: m.list_sort_name
	};

	function entry(label: string, change: Partial<WatchlistOptions>, current: boolean): FilterEntry {
		return { label, query: watchlistQuery({ ...data.options, ...change }), current };
	}

	const menus = $derived.by((): FilterMenu[] => {
		const { options } = data;
		const kinds = [
			{ kind: 'film' as const, label: m.nav_films() },
			{ kind: 'series' as const, label: m.nav_series() }
		];
		return [
			{
				label: kinds.find((item) => item.kind === options.kind)?.label ?? m.watchlist_kind(),
				entries: [
					entry(m.watchlist_any_kind(), { kind: null }, options.kind === null),
					...kinds.map((item) => entry(item.label, { kind: item.kind }, options.kind === item.kind))
				]
			},
			{
				label:
					options.decade === null
						? m.list_decade()
						: m.browse_decade({ decade: String(options.decade) }),
				entries: [
					entry(m.list_any_decade(), { decade: null }, options.decade === null),
					...data.decades.map((decade) =>
						entry(
							m.browse_decade({ decade: String(decade) }),
							{ decade },
							options.decade === decade
						)
					)
				]
			},
			{
				label: options.genre ?? m.list_genre(),
				entries: [
					entry(m.list_any_genre(), { genre: null }, options.genre === null),
					...data.genres.map((genre) => entry(genre, { genre }, options.genre === genre))
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
			...(data.tags.length > 0
				? [
						{
							label: options.tag ?? m.watchlist_tag(),
							entries: [
								entry(m.watchlist_any_tag(), { tag: null }, options.tag === null),
								...data.tags.map((tag) => entry(tag, { tag }, options.tag === tag))
							]
						}
					]
				: []),
			{
				label: `${m.list_sort_by()} ${sortLabels[options.sort]()}`,
				entries: (Object.keys(sortLabels) as WatchlistSort[]).map((sort) =>
					entry(sortLabels[sort](), { sort }, options.sort === sort)
				)
			}
		];
	});

	const notice = $derived.by(() => {
		if (!form || !('action' in form) || 'error' in form) return null;
		if (form.action === 'add' && 'title' in form) return m.watchlist_added({ title: form.title });
		if (form.action === 'privacy' && 'isPrivate' in form) {
			return form.isPrivate ? m.watchlist_made_private() : m.watchlist_made_public();
		}
		if (form.action === 'clear') return m.watchlist_cleared();
		return null;
	});

	async function pick(work: WorkSearchResult) {
		picked = { kind: work.kind, id: String(work.id) };
		await tick();
		addForm?.requestSubmit();
	}
</script>

<svelte:head>
	<title>{m.watchlist_title()} - Selfboxd</title>
</svelte:head>

<ProfileNav />

{#if notice}<FormNotice message={notice} />{/if}

<div class="layout">
	<section>
		<h1 class="section-title">
			{data.total === 1 ? m.watchlist_count_one() : m.watchlist_count({ count: data.total })}
		</h1>
		{#if data.total > 0}
			<div class="bar">
				<FilterMenus {menus}>
					{#snippet link(item: FilterEntry)}
						<a
							href="{resolve('/(app)/watchlist')}{item.query ? `?${item.query}` : ''}"
							aria-current={item.current ? 'true' : undefined}
						>
							{item.label}
						</a>
					{/snippet}
				</FilterMenus>
			</div>
		{/if}
		{#if data.items.length === 0}
			<p class="empty">{data.total === 0 ? m.watchlist_empty() : m.watchlist_empty_tag()}</p>
		{:else}
			<ul class="items">
				{#each data.items as item (item.work.id)}
					<li title={item.note || undefined}>
						<FilmPoster film={{ ...item.work, id: item.work.externalId }} size="fill" />
						<form method="POST" action="?/remove" use:enhance>
							<input type="hidden" name="workId" value={item.work.id} />
							<button aria-label="{m.watchlist_remove()}: {item.work.title}">
								<Icon name="close" />
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<aside>
		<div class="panel">
			<form method="POST" action="?/privacy" use:enhance>
				<input type="hidden" name="private" value={String(!data.isPrivate)} />
				<button>{data.isPrivate ? m.watchlist_make_public() : m.watchlist_make_private()}</button>
			</form>
			{#if data.total > 0}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- a file download, not a page -->
				<a href={resolve('/(app)/watchlist/export')} download>{m.watchlist_export()}</a>
				{#if confirming}
					<form
						method="POST"
						action="?/clear"
						class="confirm"
						use:enhance={() =>
							async ({ update }) => {
								confirming = false;
								await update();
							}}
					>
						<p>{m.watchlist_clear_confirm({ count: data.total })}</p>
						<div class="buttons">
							<button class="button button-danger">{m.watchlist_clear()}</button>
							<button
								class="button button-secondary"
								type="button"
								onclick={() => (confirming = false)}
							>
								{m.public_cancel()}
							</button>
						</div>
					</form>
				{:else}
					<button type="button" onclick={() => (confirming = true)}>{m.watchlist_clear()}</button>
				{/if}
			{/if}
		</div>
		{#if data.isPrivate}<p class="private">{m.watchlist_private_notice()}</p>{/if}

		<h2 class="section-title">{m.watchlist_how_title()}</h2>
		<p class="how">{m.watchlist_how()}</p>

		<h2 class="section-title">{m.watchlist_add_title()}</h2>
		<button class="search" type="button" onclick={() => (searching = true)}>
			<Icon name="search" />
			{m.watchlist_search()}
		</button>
		<form method="POST" action="?/add" bind:this={addForm} use:enhance>
			<input type="hidden" name="kind" value={picked?.kind ?? ''} />
			<input type="hidden" name="workId" value={picked?.id ?? ''} />
		</form>
	</aside>
</div>

<WorkSearchDialog
	bind:open={searching}
	title={m.watchlist_dialog_title()}
	kind="all"
	onpick={(work: WorkSearchResult) => void pick(work)}
/>

<style>
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) var(--sidebar-width);
		gap: var(--space-12);
		align-items: start;
	}

	.bar {
		display: flex;
		justify-content: flex-end;
		margin-top: calc(-1 * var(--space-2));
		margin-bottom: var(--space-6);
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--color-border);
	}

	.empty {
		color: var(--color-text);
	}

	.items {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: var(--space-4) var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.items li {
		position: relative;
	}

	.items form {
		position: absolute;
		top: var(--space-1);
		right: var(--space-1);
		opacity: 0;
		transition: opacity var(--duration-fast);
	}

	.items li:hover form,
	.items li:focus-within form {
		opacity: 1;
	}

	.items button {
		display: flex;
		padding: var(--space-1);
		border: 0;
		border-radius: 50%;
		background: var(--color-scrim);
		color: var(--color-heading);
		cursor: pointer;
	}

	.items button:hover {
		background: var(--color-danger-button);
	}

	aside {
		display: flex;
		flex-direction: column;
	}

	.panel {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		margin-bottom: var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-panel);
	}

	.panel > button,
	.panel > a,
	.panel > form > button {
		display: block;
		width: 100%;
		padding: var(--space-3) var(--space-4);
		border: 0;
		border-bottom: 1px solid var(--color-background);
		background: none;
		color: var(--color-text-panel);
		font: inherit;
		font-size: var(--font-size-control);
		text-align: center;
		cursor: pointer;
	}

	.panel > :last-child,
	.panel > form:last-child > button {
		border-bottom: 0;
	}

	.panel > button:hover,
	.panel > a:hover,
	.panel > form > button:hover {
		color: var(--color-heading);
	}

	.confirm {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		color: var(--color-text-strong);
		font-size: var(--font-size-control);
	}

	.buttons {
		display: flex;
		gap: var(--space-2);
		justify-content: center;
	}

	.private {
		margin-bottom: var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		text-align: center;
	}

	aside .section-title {
		margin-top: var(--space-8);
	}

	.how {
		color: var(--color-text);
		font-size: var(--font-size-body);
		line-height: var(--line-height-body);
	}

	.search {
		display: flex;
		width: 100%;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-2) var(--space-3);
		border: 0;
		border-radius: var(--radius-small);
		background: var(--color-input);
		box-shadow: var(--shadow-input);
		color: var(--color-text-muted);
		font: inherit;
		text-align: start;
		cursor: text;
	}

	.search:hover {
		color: var(--color-text);
	}

	@media (max-width: 60rem) {
		.items {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	@media (max-width: 48rem) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}

		.items {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
