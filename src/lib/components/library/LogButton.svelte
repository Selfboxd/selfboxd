<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { FilmSearchResult } from '#lib/catalog/film.js';
	import type { RatingScale } from '#lib/catalog/library.js';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import LogDialog from './LogDialog.svelte';
	import type { LogTarget } from './log-target.js';

	interface Props {
		scale: RatingScale;
	}

	let { scale }: Props = $props();

	/** Pause after the last keystroke before the search is sent, in milliseconds. */
	const searchDelay = 250;

	let dialog: HTMLDialogElement | undefined = $state();
	let menu: HTMLElement | undefined = $state();
	let menuOpen = $state(false);
	let query = $state('');
	let films = $state<FilmSearchResult[]>([]);
	let status = $state<'idle' | 'loading' | 'done' | 'failed'>('idle');
	let logTarget = $state<LogTarget | null>(null);

	let timer: ReturnType<typeof setTimeout> | undefined;
	let latestRequest = 0;

	const id = $props.id();

	function closeMenu() {
		menuOpen = false;
	}

	function closeOnOutsideClick(event: MouseEvent) {
		if (menu && event.target instanceof Node && !menu.contains(event.target)) closeMenu();
	}

	afterNavigate(closeMenu);

	function open() {
		query = '';
		films = [];
		status = 'idle';
		dialog?.showModal();
	}

	async function search(text: string) {
		const request = ++latestRequest;
		try {
			const address = `${resolve('/api/v1/search/films')}?q=${encodeURIComponent(text)}`;
			const response = await fetch(address);
			if (request !== latestRequest) return;
			if (!response.ok) {
				status = 'failed';
				return;
			}
			const body = (await response.json()) as { films: FilmSearchResult[] };
			if (request !== latestRequest) return;
			films = body.films;
			status = 'done';
		} catch {
			if (request === latestRequest) status = 'failed';
		}
	}

	function schedule() {
		clearTimeout(timer);
		const text = query.trim();
		if (!text) {
			latestRequest++;
			films = [];
			status = 'idle';
			return;
		}
		status = 'loading';
		timer = setTimeout(() => void search(text), searchDelay);
	}

	function pick(film: FilmSearchResult) {
		dialog?.close();
		logTarget = {
			kind: 'new',
			film: {
				id: String(film.id),
				title: film.title,
				year: film.year,
				posterPath: film.posterPath
			},
			defaults: { rating: null, liked: false, rewatch: false }
		};
	}
</script>

<svelte:window onclick={closeOnOutsideClick} />

<div class="group">
	<button class="log" type="button" onclick={open}>
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
						closeMenu();
						open();
					}}
				>
					{m.nav_log_film()}
				</button>
				<a href={resolve('/(app)/lists/new')}>{m.lists_new()}</a>
			</div>
		{/if}
	</div>
</div>

<dialog bind:this={dialog} aria-labelledby="{id}-title">
	<header>
		<h2 id="{id}-title">{m.log_search_title()}</h2>
		<button
			class="close"
			type="button"
			aria-label={m.dialog_close()}
			onclick={() => dialog?.close()}
		>
			<Icon name="close" />
		</button>
	</header>
	<div class="body">
		<label class="sr-only" for="{id}-query">{m.log_search_field()}</label>
		<input
			id="{id}-query"
			type="search"
			placeholder={m.log_search_placeholder()}
			autocomplete="off"
			bind:value={query}
			oninput={schedule}
		/>
		{#if status === 'failed'}
			<p class="status">{m.log_search_failed()}</p>
		{:else if status === 'done' && films.length === 0}
			<p class="status">{m.search_empty()}</p>
		{:else if films.length > 0}
			<ul>
				{#each films as film (film.id)}
					<li>
						<button
							type="button"
							onclick={() => {
								pick(film);
							}}
						>
							<FilmPoster {film} size="tiny" linked={false} />
							<span class="text">
								<span class="title">{film.title}</span>
								{#if film.year}<span class="year">{film.year}</span>{/if}
								{#if film.directors.length > 0}
									<span class="directors">
										{film.directors.map((person) => person.name).join(', ')}
									</span>
								{/if}
							</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</dialog>

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

	dialog {
		width: min(100% - var(--space-8), var(--dialog-width));
		margin-top: 12vh;
		padding: 0;
		border: 0;
		border-radius: var(--radius-medium);
		background: var(--color-dialog);
		box-shadow: var(--shadow-dialog);
		color: var(--color-text-strong);
	}

	dialog::backdrop {
		background: var(--color-scrim);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-6);
		border-bottom: 1px solid var(--color-dialog-divider);
	}

	h2 {
		color: var(--color-heading);
		font-family: var(--font-body);
		font-size: var(--font-size-large);
		font-weight: 700;
	}

	.close {
		display: flex;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-text-panel);
		font-size: var(--font-size-heading);
		cursor: pointer;
	}

	.close:hover {
		color: var(--color-heading);
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-6);
	}

	input {
		width: 100%;
		padding: var(--space-3);
		border: 0;
		border-radius: var(--radius-small);
		background: var(--color-field-light);
		color: var(--color-field-light-text);
		font: inherit;
		font-size: var(--font-size-large);
	}

	input::placeholder {
		color: var(--color-field-light-placeholder);
	}

	input:focus {
		background: var(--color-input-focus);
		outline: none;
	}

	ul {
		overflow-y: auto;
		max-height: 50vh;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li button {
		display: flex;
		width: 100%;
		gap: var(--space-3);
		align-items: center;
		padding: var(--space-2);
		border: 0;
		border-radius: var(--radius-small);
		background: none;
		color: var(--color-text-panel);
		font: inherit;
		text-align: start;
		cursor: pointer;
	}

	li button:hover,
	li button:focus-visible {
		background: var(--color-secondary);
	}

	.title {
		color: var(--color-heading);
		font-weight: 700;
	}

	.directors {
		display: block;
		font-size: var(--font-size-control);
	}

	.status {
		color: var(--color-text-panel);
	}
</style>
