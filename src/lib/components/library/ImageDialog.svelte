<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { WorkImage } from '#lib/catalog/images.js';
	import Icon from '#lib/components/Icon.svelte';
	import { tmdbImage } from '#lib/images.js';
	import { imagesRoute } from '#lib/paths.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { WorkImagesView } from '#lib/server/api/work-images.js';
	import type { ImagesTarget } from './shared-dialogs.svelte.js';

	interface Props {
		/** The work and the kind of picture to choose; setting it opens the dialog. */
		target: ImagesTarget | null;
	}

	let { target = $bindable() }: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let loaded = $state<WorkImagesView | null>(null);
	let selected = $state<string | null>(null);
	let failed = $state(false);
	let saving = $state(false);
	let notice = $state<string | null>(null);

	const id = $props.id();
	const poster = $derived(target?.mode !== 'backdrop');
	const address = $derived(
		target ? resolve(imagesRoute(target.kind), { id: target.filmId }) : null
	);

	/** Default picture first, then the others TMDB offers, each once. */
	const choices = $derived.by((): (WorkImage & { initial: boolean })[] => {
		if (!loaded) return [];
		const initial = poster ? loaded.defaults.poster : loaded.defaults.backdrop;
		const offered = poster ? loaded.images.posters : loaded.images.backdrops;
		return [
			...(initial ? [{ path: initial, width: 0, height: 0, initial: true }] : []),
			...offered
				.filter((image) => image.path !== initial)
				.map((image) => ({ ...image, initial: false }))
		];
	});

	const current = $derived(
		loaded
			? poster
				? (loaded.choice.poster ?? loaded.defaults.poster)
				: (loaded.choice.backdrop ?? loaded.defaults.backdrop)
			: null
	);

	$effect(() => {
		if (!target || !address || !dialog) return;
		if (!dialog.open) dialog.showModal();
		loaded = null;
		failed = false;
		notice = null;
		const url = address;
		void fetch(url)
			.then(async (response) => {
				if (!response.ok) throw new Error(String(response.status));
				const body = (await response.json()) as WorkImagesView;
				if (url !== address) return;
				loaded = body;
				selected = poster
					? (body.choice.poster ?? body.defaults.poster)
					: (body.choice.backdrop ?? body.defaults.backdrop);
			})
			.catch(() => {
				failed = true;
			});
	});

	async function send(body: Record<string, string | null>): Promise<boolean> {
		if (!address) return false;
		saving = true;
		try {
			const response = await fetch(address, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!response.ok) return false;
			loaded = (await response.json()) as WorkImagesView;
			await invalidate('app:images');
			return true;
		} catch {
			return false;
		} finally {
			saving = false;
		}
	}

	async function save() {
		if (await send({ [poster ? 'poster' : 'backdrop']: selected })) dialog?.close();
		else notice = m.images_failed();
	}

	async function reset() {
		if (await send({ [poster ? 'poster' : 'backdrop']: null })) dialog?.close();
		else notice = m.images_failed();
	}

	async function useAsBanner() {
		if (!selected) return;
		notice = (await send({ banner: selected })) ? m.images_banner_saved() : m.images_failed();
	}
</script>

<dialog
	bind:this={dialog}
	class:wide={!poster}
	aria-labelledby="{id}-title"
	onclose={() => (target = null)}
>
	<header>
		<h2 id="{id}-title">{poster ? m.images_poster_title() : m.images_backdrop_title()}</h2>
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
		<div class="choices">
			<p class="source"><span>TMDB</span></p>
			{#if failed}
				<p class="message">{m.images_failed()}</p>
			{:else if !loaded}
				<p class="message">{m.load_more_loading()}</p>
			{:else if choices.length === 0}
				<p class="message">{m.images_none()}</p>
			{:else}
				<ul class="grid" class:posters={poster} role="listbox" aria-label={m.images_choices()}>
					{#each choices as image (image.path)}
						<li role="option" aria-selected={selected === image.path}>
							<button
								type="button"
								class:selected={selected === image.path}
								onclick={() => (selected = image.path)}
								aria-label={image.initial ? m.images_default() : image.path}
							>
								<img src={tmdbImage(image.path, poster ? 'w154' : 'w342')} alt="" loading="lazy" />
								{#if image.initial}<span class="badge">{m.images_default()}</span>{/if}
								{#if image.path === current}<span class="badge current">
										{m.images_current()}
									</span>{/if}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<aside class="preview">
			{#if selected}
				<img src={tmdbImage(selected, 'w500')} alt="" />
			{/if}
			{#if loaded}
				<p class="title">
					{loaded.title}
					{#if loaded.year}<span class="year">{loaded.year}</span>{/if}
				</p>
				{#if loaded.people.length > 0}
					<p class="people">
						{target?.kind === 'series' ? m.series_created_by() : m.film_directed_by()}<br />
						{loaded.people.join(', ')}
					</p>
				{/if}
				<p class="info">{poster ? m.images_poster_info() : m.images_backdrop_info()}</p>
				{#if !poster && loaded.banner && loaded.banner === selected}
					<p class="info">{m.images_is_banner()}</p>
				{/if}
			{/if}
		</aside>
	</div>

	<footer>
		{#if notice}<p class="notice" role="status">{notice}</p>{/if}
		{#if !poster}
			<button
				class="button button-secondary"
				type="button"
				disabled={!selected || saving}
				onclick={useAsBanner}
			>
				{m.images_banner()}
			</button>
		{/if}
		<button class="button button-secondary" type="button" disabled={saving} onclick={reset}>
			{poster ? m.images_reset_poster() : m.images_reset_backdrop()}
		</button>
		<button
			class="button button-primary"
			type="button"
			disabled={!selected || saving}
			onclick={save}
		>
			{m.images_save()}
		</button>
	</footer>
</dialog>

<style>
	dialog {
		width: min(100% - var(--space-8), var(--dialog-images-width));
		max-height: calc(100vh - var(--space-8));
		padding: 0;
		border: 0;
		border-radius: var(--radius-medium);
		background: var(--color-dialog);
		box-shadow: var(--shadow-dialog);
		color: var(--color-text-strong);
	}

	dialog[open] {
		display: flex;
		flex-direction: column;
	}

	dialog::backdrop {
		background: var(--color-scrim);
		backdrop-filter: blur(var(--blur-backdrop));
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
		font-size: var(--font-size-heading);
		font-weight: 700;
	}

	.close {
		display: flex;
		padding: var(--space-1);
		border: 0;
		background: none;
		color: var(--color-text-strong);
		font-size: var(--font-size-large);
		cursor: pointer;
	}

	.body {
		display: grid;
		min-height: 0;
		flex: 1;
		grid-template-columns: minmax(0, 1fr) var(--sidebar-width);
	}

	.choices {
		overflow-y: auto;
		padding: var(--space-4) var(--space-6);
	}

	.source {
		margin-bottom: var(--space-4);
		border-bottom: 1px solid var(--color-dialog-divider);
	}

	.source span {
		display: inline-block;
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--color-heading);
		color: var(--color-heading);
		letter-spacing: var(--letter-spacing-caps);
	}

	.message {
		color: var(--color-text);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--poster-list), 1fr));
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.grid:not(.posters) {
		grid-template-columns: repeat(auto-fill, minmax(var(--backdrop-choice), 1fr));
	}

	.grid button {
		position: relative;
		display: block;
		width: 100%;
		padding: 0;
		overflow: hidden;
		border: 0;
		border-radius: var(--radius-small);
		background: var(--color-chip);
		box-shadow: var(--shadow-poster);
		cursor: pointer;
	}

	.grid img {
		display: block;
		width: 100%;
		aspect-ratio: 2 / 3;
		object-fit: cover;
	}

	.grid:not(.posters) img {
		aspect-ratio: 16 / 9;
	}

	.grid button:hover,
	.grid button.selected {
		outline: 3px solid var(--color-text-strong);
		outline-offset: 1px;
	}

	.badge {
		position: absolute;
		top: var(--space-2);
		left: var(--space-2);
		padding: 0 var(--space-1);
		border-radius: var(--radius-small);
		background: var(--color-poster-bar);
		color: var(--color-heading);
		font-size: var(--font-size-micro);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.badge.current {
		top: auto;
		bottom: var(--space-2);
		background: var(--color-accent);
		color: var(--color-accent-contrast);
	}

	.preview {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-6);
		border-inline-start: 1px solid var(--color-dialog-divider);
		color: var(--color-text);
		font-size: var(--font-size-small);
	}

	.preview img {
		width: 100%;
		margin-bottom: var(--space-2);
		border-radius: var(--radius-small);
		box-shadow: var(--shadow-poster);
	}

	.title {
		color: var(--color-heading);
		font-family: var(--font-display);
		font-size: var(--font-size-large);
		font-weight: 700;
		line-height: 1.2;
	}

	.year {
		color: var(--color-text);
		font-family: var(--font-body);
		font-weight: 300;
	}

	.info {
		margin-top: var(--space-2);
		color: var(--color-text);
	}

	footer {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
		justify-content: flex-end;
		padding: var(--space-4) var(--space-6);
		border-top: 1px solid var(--color-dialog-divider);
		background: var(--color-dialog-footer);
	}

	.notice {
		margin-inline-end: auto;
		color: var(--color-text-strong);
	}

	@media (max-width: 48rem) {
		.body {
			grid-template-columns: minmax(0, 1fr);
		}

		.preview {
			display: none;
		}
	}
</style>
