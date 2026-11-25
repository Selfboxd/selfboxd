<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { WorkState } from '#lib/catalog/library.js';
	import Icon from '#lib/components/Icon.svelte';
	import RatingInput from '#lib/components/library/RatingInput.svelte';
	import type { PublicUser } from '#lib/server/auth/users.js';
	import { sharedDialogs } from '#lib/components/library/shared-dialogs.svelte.js';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		/** The film the poster shows; `id` is its TMDB identifier. */
		film: { id: number | string; title: string; year: number | null; posterPath: string | null };
	}

	interface FilmStatus {
		state: WorkState;
		lists: { id: number; name: string }[];
		listMembership: number[];
	}

	let { film }: Props = $props();

	/** Width kept free beside the poster for the menu, in pixels. */
	const menuRoom = 260;

	let status = $state<FilmStatus | null>(null);
	let loading = false;
	let menuOpen = $state(false);
	let menuOnLeft = $state(false);
	let root: HTMLElement | undefined = $state();

	const filmId = $derived(String(film.id));
	const address = $derived(resolve('/api/v1/films/[id]/state', { id: filmId }));
	const filmPath = $derived(resolve('/(app)/film/[id]', { id: filmId }));
	const scale = $derived((page.data.user as PublicUser | null | undefined)?.ratingScale ?? 'stars');

	async function load() {
		if (status || loading) return;
		loading = true;
		try {
			const response = await fetch(address);
			if (response.ok) status = (await response.json()) as FilmStatus;
		} catch {
			status = null;
		} finally {
			loading = false;
		}
	}

	async function change(body: Record<string, boolean | number | null>) {
		try {
			const response = await fetch(address, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (response.ok) status = (await response.json()) as FilmStatus;
		} catch {
			return;
		}
	}

	$effect(() => {
		const poster = root?.parentElement;
		if (!poster) return;
		const start = () => void load();
		poster.addEventListener('mouseenter', start);
		poster.addEventListener('focusin', start);
		return () => {
			poster.removeEventListener('mouseenter', start);
			poster.removeEventListener('focusin', start);
		};
	});

	function toggleMenu() {
		if (!menuOpen && root) {
			menuOnLeft = root.getBoundingClientRect().right + menuRoom > window.innerWidth;
		}
		menuOpen = !menuOpen;
	}

	function closeOnOutsideClick(event: MouseEvent) {
		if (menuOpen && root && event.target instanceof Node && !root.contains(event.target)) {
			menuOpen = false;
		}
	}

	function openLog() {
		if (!status) return;
		menuOpen = false;
		sharedDialogs.log = {
			kind: 'new',
			film: { id: filmId, title: film.title, year: film.year, posterPath: film.posterPath },
			defaults: {
				rating: status.state.rating,
				liked: status.state.liked,
				rewatch: status.state.watched
			}
		};
	}

	function openLists() {
		if (!status) return;
		menuOpen = false;
		sharedDialogs.lists = { filmId, lists: status.lists, member: status.listMembership };
	}
</script>

<svelte:window onclick={closeOnOutsideClick} />

<div class="actions" class:open={menuOpen} role="group" aria-label={film.title} bind:this={root}>
	<div class="bar">
		<button
			type="button"
			class:watched={status?.state.watched}
			aria-pressed={status?.state.watched ?? false}
			aria-label={status?.state.watched ? m.action_watched() : m.action_watch()}
			disabled={!status}
			onclick={() => change({ watched: !status?.state.watched })}
		>
			<svg class="eye" viewBox="0 0 52 32" aria-hidden="true">
				<path
					d="M2 16C9 5.500 18 2.500 26 2.500S43 5.500 50 16C43 26.500 34 29.500 26 29.500S9 26.500 2 16ZM26 7.500a8.500 8.500 0 1 0 0 17a8.500 8.500 0 1 0 0-17ZM26 12a4 4 0 1 1 0 8a4 4 0 1 1 0-8Z"
				/>
			</svg>
		</button>
		<button
			type="button"
			class:liked={status?.state.liked}
			aria-pressed={status?.state.liked ?? false}
			aria-label={status?.state.liked ? m.action_liked() : m.action_like()}
			disabled={!status}
			onclick={() => change({ liked: !status?.state.liked })}
		>
			<Icon name="heart" filled />
		</button>
		<button
			type="button"
			aria-label={m.poster_more()}
			aria-expanded={menuOpen}
			disabled={!status}
			onclick={toggleMenu}
		>
			<Icon name="more" filled />
		</button>
	</div>

	{#if menuOpen && status}
		<div class="menu" class:left={menuOnLeft}>
			<div class="rate">
				<RatingInput
					value={status.state.rating}
					{scale}
					mode="field"
					onchoose={(rating: number | null) => change({ rating })}
				/>
			</div>
			{#if status.state.logCount > 0}
				<a href="{filmPath}#activity">{m.action_show_activity()}</a>
			{/if}
			<button type="button" onclick={openLog}>
				{status.state.watched ? m.poster_log_again() : m.action_log()}
			</button>
			<button type="button" onclick={() => change({ inWatchlist: !status?.state.inWatchlist })}>
				{status.state.inWatchlist ? m.watchlist_remove() : m.poster_watchlist_add()}
			</button>
			<button type="button" onclick={openLists}>{m.poster_lists_add()}</button>
			<a href={filmPath}>{m.film_where_to_watch()}</a>
		</div>
	{/if}
</div>

<style>
	.actions {
		position: absolute;
		z-index: 2;
		inset: auto 0 0;
		display: flex;
		justify-content: center;
		padding-bottom: var(--space-1);
		opacity: 0;
		pointer-events: none;
		transition: opacity var(--duration-fast);
	}

	:global(.poster:hover) > .actions,
	.actions:focus-within,
	.actions.open {
		opacity: 1;
		pointer-events: auto;
	}

	.bar {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-medium);
		background: var(--color-poster-bar);
	}

	.bar button {
		display: flex;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-heading);
		font-size: var(--font-size-poster-action);
		cursor: pointer;
		transition:
			color var(--duration-fast),
			transform var(--duration-fast);
	}

	.bar button:hover:not(:disabled) {
		transform: scale(1.12);
	}

	.bar button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.eye {
		height: 1em;
		fill: currentcolor;
		fill-rule: evenodd;
	}

	.bar :global(.icon) {
		stroke-width: 0;
	}

	.bar .watched {
		color: var(--color-highlight);
	}

	.bar .liked {
		color: var(--color-like);
	}

	:global(.poster.small) > .actions .bar {
		gap: var(--space-1);
		padding: 2px var(--space-1);
		font-size: var(--font-size-small);
	}

	:global(.poster.small) > .actions .bar button {
		font-size: inherit;
	}

	.menu {
		position: absolute;
		z-index: 20;
		bottom: 0;
		left: calc(100% + var(--space-2));
		display: flex;
		width: var(--poster-menu-width);
		flex-direction: column;
		overflow: hidden;
		border-radius: var(--radius-medium);
		background: var(--color-menu);
		box-shadow: var(--shadow-button), var(--shadow-menu);
	}

	.menu.left {
		right: calc(100% + var(--space-2));
		left: auto;
	}

	.rate {
		display: flex;
		justify-content: center;
		padding: var(--space-2);
	}

	.rate :global(.input.stars button.on) {
		color: var(--color-highlight);
	}

	.rate :global(.input button) {
		color: var(--color-secondary);
	}

	.menu a,
	.menu > button {
		padding: var(--space-2) var(--space-3);
		border: 0;
		border-top: 1px solid var(--color-menu-divider);
		background: none;
		color: var(--color-menu-text);
		font-family: inherit;
		font-size: var(--font-size-control);
		text-align: center;
		cursor: pointer;
	}

	.menu a:hover,
	.menu > button:hover {
		background: var(--color-menu-hover);
		color: var(--color-heading);
	}
</style>
