<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { WorkKind, WorkState } from '#lib/catalog/library.js';
	import { posterStates, type PosterStatus } from './poster-states.svelte.js';
	import { stateRoute, workRoute } from '#lib/paths.js';
	import Icon from '#lib/components/Icon.svelte';
	import RatingInput from '#lib/components/library/RatingInput.svelte';
	import type { PublicUser } from '#lib/server/auth/users.js';
	import { sharedDialogs } from '#lib/components/library/shared-dialogs.svelte.js';
	import type { PosterSeason } from '#lib/components/library/log-target.js';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		/** The film or series the poster shows; `id` is its TMDB identifier. */
		film: {
			id: number | string;
			kind?: WorkKind;
			title: string;
			year: number | null;
			posterPath: string | null;
		};
		/** The season of a series the poster shows, which the log dialog starts from. */
		season?: PosterSeason | undefined;
	}

	let { film, season }: Props = $props();

	/** Width kept free beside the poster for the menu, in pixels. */
	const menuRoom = 260;

	let menuOpen = $state(false);
	let menuOnLeft = $state(false);
	let root: HTMLElement | undefined = $state();

	const filmId = $derived(String(film.id));
	const kind = $derived(film.kind ?? 'film');
	const key = $derived(posterStates.key(kind, filmId));
	const status = $derived(posterStates.statuses.get(key));
	const address = $derived(resolve(stateRoute(kind), { id: filmId }));
	const filmPath = $derived(resolve(workRoute(kind), { id: filmId }));
	const scale = $derived((page.data.user as PublicUser | null | undefined)?.ratingScale ?? 'stars');

	$effect(() => {
		const round = posterStates.generation;
		const wanted = key;
		const poster = root?.parentElement;
		if (!poster) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					if (round === posterStates.generation) posterStates.want(wanted);
					observer.disconnect();
				}
			},
			{ rootMargin: '400px' }
		);
		observer.observe(poster);
		return () => {
			observer.disconnect();
		};
	});

	type Change = Partial<Pick<WorkState, 'watched' | 'liked' | 'rating' | 'inWatchlist'>>;

	/** Shows the change at once, then saves it, going back when the server refuses it. */
	async function change(make: (state: WorkState) => Change) {
		await posterStates.ready(key);
		const before = posterStates.statuses.get(key);
		if (!before) return;
		const body = make(before.state);
		const optimistic = { ...before.state, ...body };
		if (body.watched === false) optimistic.rating = null;
		if (body.watched === true || body.rating != null) {
			optimistic.watched = true;
			optimistic.inWatchlist = false;
		}
		posterStates.set(key, { ...before, state: optimistic });
		try {
			const response = await fetch(address, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!response.ok) throw new Error(String(response.status));
			const saved = (await response.json()) as PosterStatus & { lists: unknown };
			posterStates.set(key, { state: saved.state, listMembership: saved.listMembership });
		} catch {
			posterStates.set(key, before);
		}
	}

	function toggleMenu() {
		if (!status) void posterStates.ready(key);
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
			film: {
				id: filmId,
				kind,
				title: season?.title ?? film.title,
				year: film.year,
				posterPath: film.posterPath
			},
			defaults: {
				rating: status.state.rating,
				liked: status.state.liked,
				rewatch: status.state.watched,
				season: season?.number ?? null
			},
			seasons: season?.seasons ?? [],
			status: status.state.status
		};
	}

	function openImages(mode: 'poster' | 'backdrop') {
		menuOpen = false;
		sharedDialogs.images = { filmId, kind, mode };
	}

	function openLists() {
		if (!status) return;
		menuOpen = false;
		sharedDialogs.lists = {
			filmId,
			kind,
			lists: posterStates.lists,
			member: status.listMembership
		};
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
			onclick={() => change((state) => ({ watched: !state.watched }))}
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
			onclick={() => change((state) => ({ liked: !state.liked }))}
		>
			<Icon name="heart" filled />
		</button>
		<button
			type="button"
			aria-label={m.poster_more()}
			aria-expanded={menuOpen}
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
					onchoose={(rating: number | null) => change(() => ({ rating }))}
				/>
			</div>
			{#if status.state.logCount > 0}
				<a href="{filmPath}#activity">{m.action_show_activity()}</a>
			{/if}
			<button type="button" onclick={openLog}>
				{status.state.watched ? m.poster_log_again() : m.action_log()}
			</button>
			<button
				type="button"
				onclick={() => change((state) => ({ inWatchlist: !state.inWatchlist }))}
			>
				{status.state.inWatchlist ? m.watchlist_remove() : m.poster_watchlist_add()}
			</button>
			<button type="button" onclick={openLists}>{m.poster_lists_add()}</button>
			<div class="sub" class:left={menuOnLeft}>
				<button type="button" aria-haspopup="true">{m.poster_images()}</button>
				<div class="submenu">
					<button
						type="button"
						onclick={() => {
							openImages('poster');
						}}
					>
						{m.poster_change_poster()}
					</button>
					<button
						type="button"
						onclick={() => {
							openImages('backdrop');
						}}
					>
						{m.poster_change_backdrop()}
					</button>
				</div>
			</div>
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
		padding-bottom: 8%;
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
		gap: 0.6em;
		align-items: center;
		padding: 0.35em 0.6em;
		border-radius: 0.35em;
		background: var(--color-poster-bar);
		font-size: var(--font-size-poster-action);
	}

	.bar button {
		display: flex;
		align-items: center;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-poster-action);
		font-size: inherit;
		cursor: pointer;
		transition:
			color var(--duration-fast),
			transform var(--duration-fast);
	}

	.bar button:hover {
		color: var(--color-heading);
		transform: scale(1.1);
	}

	.eye {
		height: 1em;
		fill: currentcolor;
		fill-rule: evenodd;
	}

	.bar :global(.icon) {
		width: 1.15em;
		height: 1.15em;
		stroke-width: 0;
	}

	.bar .watched,
	.bar .watched:hover {
		color: var(--color-highlight);
	}

	.bar .liked,
	.bar .liked:hover {
		color: var(--color-like);
	}

	.menu {
		position: absolute;
		z-index: 20;
		bottom: 0;
		left: calc(100% + var(--space-2));
		display: flex;
		width: var(--poster-menu-width);
		flex-direction: column;
		border-radius: var(--radius-medium);
		background: var(--color-menu);
		box-shadow: var(--shadow-button), var(--shadow-menu);
	}

	.menu > :last-child,
	.menu > :last-child > button {
		border-bottom-right-radius: var(--radius-medium);
		border-bottom-left-radius: var(--radius-medium);
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
	.menu > button,
	.sub > button,
	.submenu button {
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

	.sub {
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.submenu {
		position: absolute;
		top: 0;
		left: calc(100% + var(--space-1));
		display: none;
		width: var(--poster-menu-width);
		flex-direction: column;
		overflow: hidden;
		border-radius: var(--radius-medium);
		background: var(--color-menu);
		box-shadow: var(--shadow-button), var(--shadow-menu);
	}

	.sub.left .submenu {
		right: calc(100% + var(--space-1));
		left: auto;
	}

	.sub:hover .submenu,
	.sub:focus-within .submenu {
		display: flex;
	}

	.submenu button:first-child {
		border-top: 0;
	}

	.menu a:hover,
	.menu > button:hover,
	.sub > button:hover,
	.sub:focus-within > button,
	.submenu button:hover {
		background: var(--color-menu-hover);
		color: var(--color-heading);
	}
</style>
