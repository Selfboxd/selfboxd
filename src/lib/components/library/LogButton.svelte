<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { RatingScale, SeriesStatus } from '#lib/catalog/library.js';
	import type { WorkSearchResult } from '#lib/catalog/search.js';
	import Icon from '#lib/components/Icon.svelte';
	import { seasonName } from '#lib/i18n/series.js';
	import { m } from '#lib/paraglide/messages.js';
	import LogDialog from './LogDialog.svelte';
	import type { LogSeason, LogTarget } from './log-target.js';
	import WorkSearchDialog from './WorkSearchDialog.svelte';

	interface Props {
		scale: RatingScale;
	}

	let { scale }: Props = $props();

	let searchOpen = $state(false);
	let searchKind = $state<'all' | 'film' | 'series'>('all');
	let menu: HTMLElement | undefined = $state();
	let menuOpen = $state(false);
	let logTarget = $state<LogTarget | null>(null);

	function closeMenu() {
		menuOpen = false;
	}

	function closeOnOutsideClick(event: MouseEvent) {
		if (menu && event.target instanceof Node && !menu.contains(event.target)) closeMenu();
	}

	afterNavigate(closeMenu);

	function open(kind: 'all' | 'film' | 'series') {
		closeMenu();
		searchKind = kind;
		searchOpen = true;
	}

	/** Seasons and status of a series, so that the dialog can offer them; empty when they fail to load. */
	async function seriesChoices(
		id: number
	): Promise<{ seasons: LogSeason[]; status?: SeriesStatus }> {
		try {
			const [details, state] = await Promise.all([
				fetch(resolve('/api/v1/series/[id]', { id: String(id) })),
				fetch(resolve('/api/v1/series/[id]/state', { id: String(id) }))
			]);
			const seasons = details.ok
				? ((await details.json()) as { series: { seasons: { number: number }[] } }).series.seasons
				: [];
			const status = state.ok
				? ((await state.json()) as { state: { status: SeriesStatus | null } }).state.status
				: null;
			return {
				seasons: seasons.map((season) => ({
					number: season.number,
					name: seasonName(season.number)
				})),
				...(status ? { status } : {})
			};
		} catch {
			return { seasons: [] };
		}
	}

	async function pick(work: WorkSearchResult) {
		const film = {
			id: String(work.id),
			kind: work.kind,
			title: work.title,
			year: work.year,
			posterPath: work.posterPath
		};
		const defaults = { rating: null, liked: false, rewatch: false };
		logTarget =
			work.kind === 'series'
				? { kind: 'new', film, defaults, ...(await seriesChoices(work.id)) }
				: { kind: 'new', film, defaults };
	}
</script>

<svelte:window onclick={closeOnOutsideClick} />

<div class="group">
	<button
		class="log"
		type="button"
		onclick={() => {
			open('all');
		}}
	>
		<Icon name="plus" />
		{m.nav_log()}
	</button>
	<div class="more" bind:this={menu}>
		<button
			class="chevron"
			type="button"
			aria-label={m.nav_log_more()}
			aria-expanded={menuOpen}
			onclick={() => (menuOpen = !menuOpen)}
		>
			<Icon name="chevron" />
		</button>
		{#if menuOpen}
			<div class="menu">
				<button
					type="button"
					onclick={() => {
						open('film');
					}}
				>
					{m.nav_log_film()}
				</button>
				<button
					type="button"
					onclick={() => {
						open('series');
					}}
				>
					{m.nav_log_series()}
				</button>
				<a href={resolve('/(app)/profile/lists/new')}>{m.lists_new()}</a>
			</div>
		{/if}
	</div>
</div>

<WorkSearchDialog
	bind:open={searchOpen}
	title={m.log_search_title()}
	kind={searchKind}
	onpick={(work: WorkSearchResult) => void pick(work)}
/>

<LogDialog bind:target={logTarget} {scale} />

<style>
	.group {
		position: relative;
		display: flex;
	}

	.chevron {
		display: flex;
		align-items: center;
		height: var(--log-button-height);
		padding: 0 var(--space-1);
		border: 0;
		border-left: 1px solid var(--color-accent-hover);
		border-radius: 0 var(--radius-small) var(--radius-small) 0;
		background: var(--color-accent);
		box-shadow: var(--shadow-button);
		color: var(--color-accent-contrast);
		cursor: pointer;
	}

	.chevron:hover {
		background: var(--color-accent-hover);
	}

	.chevron :global(svg) {
		stroke-width: 2.5;
	}

	.menu {
		position: absolute;
		z-index: 10;
		top: calc(100% + var(--space-1));
		right: 0;
		display: flex;
		min-width: 100%;
		flex-direction: column;
		padding: var(--space-1) 0;
		border-radius: var(--radius-small);
		background: var(--color-menu);
		box-shadow: var(--shadow-button), var(--shadow-menu);
	}

	.menu a,
	.menu button {
		padding: var(--space-1) var(--space-3);
		border: 0;
		background: none;
		color: var(--color-menu-text);
		font-family: inherit;
		font-size: var(--font-size-control);
		text-align: start;
		white-space: nowrap;
		cursor: pointer;
	}

	.menu a:hover,
	.menu button:hover {
		background: var(--color-menu-hover);
		color: var(--color-heading);
	}

	.log {
		display: flex;
		gap: var(--space-1);
		align-items: center;
		height: var(--log-button-height);
		padding: 0 var(--space-2);
		border: 0;
		border-radius: var(--radius-small) 0 0 var(--radius-small);
		background: var(--color-accent);
		box-shadow: var(--shadow-button);
		color: var(--color-accent-contrast);
		font-family: inherit;
		font-size: var(--font-size-control);
		font-weight: 700;
		line-height: 1;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
		cursor: pointer;
	}

	.log:hover {
		background: var(--color-accent-hover);
	}

	.log :global(svg) {
		stroke-width: 2.5;
	}
</style>
