<script lang="ts">
	import { resolve } from '$app/paths';
	import type { WorkSearchResult } from '#lib/catalog/search.js';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		/** Set to `true` to open the dialog; reset when the dialog closes. */
		open: boolean;
		/** Heading of the dialog. */
		title: string;
		/** What the search covers. */
		kind?: 'all' | 'film' | 'series';
		/** Receives the work chosen among the results; the dialog closes first. */
		onpick: (work: WorkSearchResult) => void;
	}

	let { open = $bindable(), title, kind = 'film', onpick }: Props = $props();

	const labels = {
		all: m.log_search_field,
		film: m.log_search_field_film,
		series: m.log_search_field_series
	};

	const placeholders = {
		all: m.log_search_placeholder_all,
		film: m.log_search_placeholder,
		series: m.log_search_placeholder_series
	};

	/** Pause after the last keystroke before the search is sent, in milliseconds. */
	const searchDelay = 250;

	let dialog: HTMLDialogElement | undefined = $state();
	let query = $state('');
	let works = $state<WorkSearchResult[]>([]);
	let status = $state<'idle' | 'loading' | 'done' | 'failed'>('idle');

	let timer: ReturnType<typeof setTimeout> | undefined;
	let latestRequest = 0;

	const id = $props.id();

	$effect(() => {
		if (!open || !dialog || dialog.open) return;
		query = '';
		works = [];
		status = 'idle';
		dialog.showModal();
	});

	async function search(text: string) {
		const request = ++latestRequest;
		try {
			const parameters = new URLSearchParams({ q: text, kind });
			const address = `${resolve('/api/v1/search/works')}?${parameters.toString()}`;
			const response = await fetch(address);
			if (request !== latestRequest) return;
			if (!response.ok) {
				status = 'failed';
				return;
			}
			const body = (await response.json()) as { works: WorkSearchResult[] };
			if (request !== latestRequest) return;
			works = body.works;
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
			works = [];
			status = 'idle';
			return;
		}
		status = 'loading';
		timer = setTimeout(() => void search(text), searchDelay);
	}

	function pick(work: WorkSearchResult) {
		dialog?.close();
		onpick(work);
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
		<label class="sr-only" for="{id}-query">{labels[kind]()}</label>
		<input
			id="{id}-query"
			type="search"
			placeholder={placeholders[kind]()}
			autocomplete="off"
			bind:value={query}
			oninput={schedule}
		/>
		{#if status === 'failed'}
			<p class="status">{m.log_search_failed()}</p>
		{:else if status === 'done' && works.length === 0}
			<p class="status">{m.log_search_empty()}</p>
		{:else if works.length > 0}
			<ul>
				{#each works as work (`${work.kind}:${String(work.id)}`)}
					<li>
						<button
							type="button"
							onclick={() => {
								pick(work);
							}}
						>
							<FilmPoster film={work} size="tiny" linked={false} />
							<span class="text">
								<span class="title">{work.title}</span>
								{#if work.year}<span class="year">{work.year}</span>{/if}
								{#if kind === 'all' && work.kind === 'series'}
									<span class="badge">{m.nav_series()}</span>
								{/if}
								{#if work.people.length > 0}
									<span class="directors">
										{work.people.map((person) => person.name).join(', ')}
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
		width: min(100% - var(--space-8), var(--dialog-search-width));
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
		backdrop-filter: blur(var(--blur-backdrop));
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-dialog-divider);
	}

	h2 {
		color: var(--color-heading);
		font-family: var(--font-body);
		font-size: var(--font-size-body);
		font-weight: 700;
	}

	.close {
		display: flex;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-text-panel);
		font-size: var(--font-size-large);
		cursor: pointer;
	}

	.close:hover {
		color: var(--color-heading);
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
	}

	input {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: 0;
		border-radius: var(--radius-small);
		background: var(--color-field-light);
		color: var(--color-field-light-text);
		font: inherit;
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

	.year {
		margin-inline-start: var(--space-1);
	}

	.badge {
		margin-inline-start: var(--space-2);
		padding: 0 var(--space-1);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-small);
		font-size: var(--font-size-small);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.directors {
		display: block;
		font-size: var(--font-size-control);
	}

	.status {
		color: var(--color-text-panel);
	}
</style>
