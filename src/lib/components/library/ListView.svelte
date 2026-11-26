<script lang="ts">
	import { toasts } from '#lib/components/toast/toasts.svelte.js';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import {
		listOptionsQuery,
		type ListEntry,
		type ListOptions,
		type ListTarget,
		type ListSort,
		type ListVisibility
	} from '#lib/catalog/list-view.js';
	import type { ListProgress } from '#lib/catalog/lists.js';
	import Avatar from '#lib/components/Avatar.svelte';
	import Backdrop from '#lib/components/Backdrop.svelte';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import FilterMenus from '#lib/components/FilterMenus.svelte';
	import type { Service } from '#lib/catalog/streaming.js';
	import type { FilterEntry } from '#lib/components/filter-menus.js';
	import Icon from '#lib/components/Icon.svelte';
	import WatchProgress from './WatchProgress.svelte';
	import { relativeTime } from '#lib/i18n/dates.js';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import { workRoute } from '#lib/paths.js';
	import type { PublicUser } from '#lib/server/auth/users.js';

	interface Props {
		target: ListTarget;
		name: string;
		description?: string;
		/** Name of who made the list, or `null` when it is unknown. */
		owner: string | null;
		/** The local account that made the list, shown with its picture. */
		account?: PublicUser | undefined;
		/** Number of films in the whole list, when it is known. */
		count: number | null;
		/** Path of the TMDB backdrop shown as banner. */
		backdropPath: string | null;
		/** Entries shown, already narrowed and ordered by the options. */
		entries: ListEntry[];
		/** Text shown instead of the films when there is none. */
		empty: string;
		progress: ListProgress | null;
		options: ListOptions;
		/** Decades the list can be narrowed to, newest first. */
		decades: number[];
		/** Genres the list can be narrowed to. */
		genres: string[];
		/** Streaming services of the account, offered as a filter. */
		services?: Service[];
		/** Whether the place of each film is shown. */
		ranked?: boolean;
		/** Whether the account likes the list. */
		liked: boolean;
		/** Address of the list on the platform when the account shared it. */
		shared?: string | null;
		/** Last change of the list, as an ISO timestamp, when it is known. */
		updatedAt?: string | null;
		/** Content shown under the films. */
		children?: Snippet;
	}

	let {
		target,
		name,
		description = '',
		owner,
		account,
		count,
		backdropPath,
		entries,
		empty,
		progress,
		options,
		decades,
		genres,
		services = [],
		ranked = true,
		liked,
		shared = null,
		updatedAt = null,
		children
	}: Props = $props();

	const path = $derived(
		'personal' in target
			? resolve('/(app)/profile/lists/[id]', { id: String(target.personal) })
			: 'public' in target
				? resolve('/(app)/lists/[id]', { id: String(target.public) })
				: resolve('/(app)/lists/official/[chart]', { chart: target.chart })
	);
	const action = $derived(page.form as { action?: string; error?: string } | null);
	const shareUrl = $derived(shared);
	let sharing = $state(false);
	const shareError = $derived(
		(action?.action === 'share' || action?.action === 'unshare') && action.error
			? errorMessage(action.error)
			: null
	);
	let copied = $state(false);

	$effect(() => {
		if ((page.form as { action?: string } | null | undefined)?.action === 'watchlist') {
			toasts.show(m.list_added_watchlist());
		}
	});

	const sortLabels: Record<ListSort, () => string> = {
		list: m.list_sort_list,
		reverse: m.list_sort_reverse,
		name: m.list_sort_name,
		newest: m.list_sort_newest,
		oldest: m.list_sort_oldest,
		rating: m.list_sort_rating
	};

	const visibilityLabels: Record<ListVisibility, () => string> = {
		all: m.list_show_all,
		unwatched: m.list_show_unwatched,
		watched: m.list_show_watched
	};

	function entry(label: string, change: Partial<ListOptions>, current: boolean): FilterEntry {
		return { label, query: listOptionsQuery({ ...options, ...change }), current };
	}

	const decadeMenu = $derived([
		entry(m.list_any_decade(), { decade: null }, options.decade === null),
		...decades.map((decade) =>
			entry(m.browse_decade({ decade: String(decade) }), { decade }, options.decade === decade)
		)
	]);
	const serviceMenu = $derived([
		entry(m.filter_any_service(), { service: null }, options.service === null),
		...services.map((service) =>
			entry(service.name, { service: service.id }, options.service === service.id)
		)
	]);
	const genreMenu = $derived([
		entry(m.list_any_genre(), { genre: null }, options.genre === null),
		...genres.map((genre) => entry(genre, { genre }, options.genre === genre))
	]);
	const sortMenu = $derived(
		(Object.keys(sortLabels) as ListSort[]).map((sort) =>
			entry(sortLabels[sort](), { sort }, options.sort === sort)
		)
	);
	const visibilityMenu = $derived(
		(Object.keys(visibilityLabels) as ListVisibility[]).map((visibility) =>
			entry(visibilityLabels[visibility](), { visibility }, options.visibility === visibility)
		)
	);
</script>

{#if backdropPath}<Backdrop path={backdropPath} short />{/if}

<div class="list" class:with-backdrop={backdropPath}>
	<div class="content">
		<header>
			<div class="byline">
				{#if owner !== null}
					<p class="owner">
						{#if account}<Avatar user={account} />{/if}
						<span>{m.list_by()}</span>
						<strong>{owner}</strong>
					</p>
				{/if}
				{#if count !== null}<p class="count">{m.list_count({ count })}</p>{/if}
			</div>
			<nav class="bar" aria-label={m.list_bar()}>
				<p class="updated">
					{#if updatedAt}{m.list_updated({ when: relativeTime(new Date(updatedAt)) })}{/if}
				</p>
				<FilterMenus
					menus={[
						{ label: m.list_decade(), entries: decadeMenu },
						...(genres.length > 0 ? [{ label: m.list_genre(), entries: genreMenu }] : []),
						...(services.length > 0
							? [
									{
										label:
											services.find((service) => service.id === options.service)?.name ??
											m.filter_service(),
										entries: serviceMenu
									}
								]
							: []),
						{ label: `${m.list_sort_by()} ${sortLabels[options.sort]()}`, entries: sortMenu },
						{ label: m.list_visibility(), icon: 'eye' as const, entries: visibilityMenu }
					]}
				>
					{#snippet link(item: FilterEntry)}
						<a
							href="{path}{item.query ? `?${item.query}` : ''}"
							aria-current={item.current ? 'true' : undefined}
						>
							{item.label}
						</a>
					{/snippet}
				</FilterMenus>
				<div class="modes">
					<a
						href="{path}{listOptionsQuery({ ...options, mode: 'grid' })
							? `?${listOptionsQuery({ ...options, mode: 'grid' })}`
							: ''}"
						aria-label={m.list_view_grid()}
						title={m.list_view_grid()}
						aria-current={options.mode === 'grid' ? 'true' : undefined}
					>
						<Icon name="grid" />
					</a>
					<a
						href="{path}?{listOptionsQuery({ ...options, mode: 'detail' })}"
						aria-label={m.list_view_detail()}
						title={m.list_view_detail()}
						aria-current={options.mode === 'detail' ? 'true' : undefined}
					>
						<Icon name="list" />
					</a>
				</div>
			</nav>
		</header>

		<h1>{name}</h1>
		{#if description}<p class="description">{description}</p>{/if}

		{#if entries.length === 0}
			<p class="empty">{empty}</p>
		{:else if options.mode === 'detail'}
			<ol class="rows">
				{#each entries as { film, position, note, watched } (film.id)}
					<li>
						<span class="number">{ranked ? position : ''}</span>
						<FilmPoster {film} size="small" />
						<div class="row-text">
							<h2>
								<a href={resolve(workRoute(film.kind ?? 'film'), { id: String(film.id) })}>
									{film.title}
								</a>
								{#if film.year}<span class="year">{film.year}</span>{/if}
								{#if watched}<span class="seen">
										<Icon name="eye" label={m.action_watched()} />
									</span>{/if}
							</h2>
							{#if note}<p class="note">{note}</p>{/if}
						</div>
					</li>
				{/each}
			</ol>
		{:else}
			<ul class="grid">
				{#each entries as { film, position, note, watched } (film.id)}
					<li class:watched>
						<FilmPoster {film} size="medium" />
						{#if ranked}<p class="position">{position}</p>{/if}
						{#if note}<p class="note">{note}</p>{/if}
					</li>
				{/each}
			</ul>
		{/if}

		{@render children?.()}
	</div>

	<aside>
		<div class="panel">
			<form method="POST" action="{path}?/like" use:enhance>
				<input type="hidden" name="liked" value={liked ? '' : 'on'} />
				<button class="like" class:liked aria-pressed={liked}>
					<Icon name="heart" filled />
					{liked ? m.list_liked() : m.list_like()}
				</button>
			</form>
			{#if 'personal' in target}
				<a href={resolve('/(app)/profile/lists/[id]/edit', { id: String(target.personal) })}>
					{m.list_edit_or_delete()}
				</a>
			{/if}
			<form method="POST" action="{path}?/clone" use:enhance>
				<button>{m.list_clone()}</button>
			</form>
			<form method="POST" action="{path}?/watchlist" use:enhance>
				<button>{m.list_add_all_watchlist()}</button>
			</form>
			<form
				method="POST"
				action="{path}?/share"
				use:enhance={() => {
					sharing = true;
					return async ({ update }) => {
						await update();
						sharing = false;
					};
				}}
			>
				<button disabled={sharing} aria-busy={sharing}>
					{sharing ? m.list_sharing() : shareUrl ? m.list_share_update() : m.list_share()}
				</button>
			</form>
			{#if shareUrl}
				<div class="shared">
					<span class="shared-label">{m.list_shared()}</span>
					<div class="shared-link">
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- the shared list lives on the platform -->
						<a href={shareUrl} target="_blank" rel="noopener noreferrer">
							{shareUrl.replace(/^https?:\/\//, '')}
						</a>
						<button
							type="button"
							class="tool"
							aria-label={copied ? m.public_copied() : m.public_copy()}
							title={copied ? m.public_copied() : m.public_copy()}
							onclick={async () => {
								await navigator.clipboard.writeText(shareUrl);
								copied = true;
							}}
						>
							<Icon name={copied ? 'check' : 'copy'} />
						</button>
						<form method="POST" action="{path}?/unshare" use:enhance>
							<button class="tool" aria-label={m.list_share_stop()} title={m.list_share_stop()}>
								<Icon name="close" />
							</button>
						</form>
					</div>
				</div>
			{/if}
			{#if shareError}<p class="failed" role="alert">{shareError}</p>{/if}
		</div>
		{#if progress}<WatchProgress {progress} />{/if}
	</aside>
</div>

<style>
	.list {
		display: grid;
		grid-template-columns: minmax(0, 1fr) var(--sidebar-width);
		gap: var(--space-8);
		align-items: start;
	}

	.with-backdrop {
		margin-top: var(--list-offset);
	}

	header {
		margin-bottom: var(--space-4);
		font-size: var(--font-size-small);
	}

	.byline {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-2);
	}

	.owner {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		font-size: var(--font-size-body);
	}

	.count {
		margin-inline-start: auto;
		color: var(--color-text);
	}

	.owner :global(.avatar) {
		width: var(--avatar-medium);
		height: var(--avatar-medium);
	}

	.owner strong {
		color: var(--color-text-strong);
	}

	.bar {
		display: flex;
		gap: var(--space-1);
		align-items: center;
		min-height: var(--list-bar-height);
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}

	.updated {
		overflow: hidden;
		min-width: 0;
		margin-inline-end: auto;
		color: var(--color-text);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.modes {
		display: flex;
		gap: var(--space-1);
	}

	.modes a {
		display: flex;
		padding: var(--space-1);
		border-radius: var(--radius-small);
		color: var(--color-text-muted);
		font-size: var(--font-size-body);
	}

	.modes a:hover,
	.modes a[aria-current] {
		color: var(--color-text-strong);
	}

	.modes a[aria-current] {
		background: var(--color-panel);
	}

	h1 {
		font-family: var(--font-display);
		font-size: var(--font-size-title);
		font-weight: 900;
		line-height: 1.15;
		letter-spacing: -0.01em;
		overflow-wrap: anywhere;
	}

	.description {
		max-width: 38rem;
		margin-top: var(--space-3);
		font-family: var(--font-heading);
		font-size: var(--font-size-prose);
		white-space: pre-line;
		overflow-wrap: anywhere;
	}

	.empty {
		margin-top: var(--space-6);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, var(--poster-list));
		gap: var(--space-4) var(--space-2);
		justify-content: space-between;
		margin: var(--space-6) 0 0;
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

	.position {
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--font-size-control);
		text-align: center;
	}

	.note {
		margin-top: var(--space-1);
		font-size: var(--font-size-small);
		overflow-wrap: anywhere;
	}

	.rows {
		margin: var(--space-6) 0 0;
		padding: 0;
		list-style: none;
	}

	.rows li {
		display: flex;
		gap: var(--space-4);
		align-items: flex-start;
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.number {
		min-width: 2rem;
		padding-top: var(--space-1);
		color: var(--color-text-muted);
		text-align: end;
	}

	.row-text {
		min-width: 0;
	}

	.row-text h2 {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: baseline;
		font-family: var(--font-heading);
		font-size: var(--font-size-large);
		font-weight: 700;
	}

	.row-text a {
		color: var(--color-heading);
	}

	.row-text a:hover {
		color: var(--color-link-hover);
	}

	.year {
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-body);
		font-weight: 300;
	}

	.seen {
		color: var(--color-highlight);
		font-size: var(--font-size-body);
	}

	aside {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.panel {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-radius: var(--radius-medium);
		background: var(--color-surface-raised);
	}

	.panel > a,
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

	.panel > a:hover,
	.panel button:hover {
		color: var(--color-heading);
	}

	.like {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		justify-content: center;
	}

	.like :global(.icon) {
		color: var(--color-text-muted);
	}

	.like.liked :global(.icon) {
		color: var(--color-like);
	}

	.shared {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-3) var(--space-3);
		border-top: 1px solid var(--color-dialog-divider);
	}

	.shared-label {
		color: var(--color-text-panel);
		font-size: var(--font-size-micro);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.shared-link {
		display: flex;
		gap: var(--space-1);
		align-items: center;
		padding: var(--space-1) var(--space-1) var(--space-1) var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-panel);
	}

	.shared-link a {
		overflow: hidden;
		flex: 1;
		min-width: 0;
		color: var(--color-text-strong);
		font-size: var(--font-size-small);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.shared-link a:hover {
		color: var(--color-link-hover);
	}

	.panel .shared-link .tool {
		display: flex;
		width: auto;
		padding: var(--space-1);
		border: 0;
		border-radius: var(--radius-small);
		color: var(--color-text-panel);
		font-size: var(--font-size-body);
	}

	.panel .shared-link .tool:hover {
		background: var(--color-surface-raised);
		color: var(--color-heading);
	}

	.failed {
		padding: var(--space-2) var(--space-3);
		border-top: 1px solid var(--color-dialog-divider);
		color: var(--color-danger);
		font-size: var(--font-size-control);
		text-align: center;
	}

	@media (max-width: 48rem) {
		.list {
			grid-template-columns: minmax(0, 1fr);
		}

		.bar {
			flex-wrap: wrap;
		}
	}
</style>
