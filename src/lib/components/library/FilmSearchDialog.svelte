<script lang="ts">
	import { resolve } from '$app/paths';
	import type { FilmSearchResult } from '#lib/catalog/film.js';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		/** Set to `true` to open the dialog; reset when the dialog closes. */
		open: boolean;
		/** Heading of the dialog. */
		title: string;
		/** Receives the film chosen among the results; the dialog closes first. */
		onpick: (film: FilmSearchResult) => void;
	}

	let { open = $bindable(), title, onpick }: Props = $props();

	/** Pause after the last keystroke before the search is sent, in milliseconds. */
	const searchDelay = 250;

	let dialog: HTMLDialogElement | undefined = $state();
	let query = $state('');
	let films = $state<FilmSearchResult[]>([]);
	let status = $state<'idle' | 'loading' | 'done' | 'failed'>('idle');

	let timer: ReturnType<typeof setTimeout> | undefined;
	let latestRequest = 0;

	const id = $props.id();

	$effect(() => {
		if (!open || !dialog || dialog.open) return;
		query = '';
		films = [];
		status = 'idle';
		dialog.showModal();
	});

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
		onpick(film);
	}
</script>

<dialog bind:this={dialog} aria-labelledby="{id}-title" onclose={() => (open = false)}>
	<header>
		<h2 id="{id}-title">{title}</h2>
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

<style>
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
