<script lang="ts">
	import { enhance, type ActionResult } from '$app/forms';
	import { refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import type { DiaryEntry, RatingScale, SeriesStatus } from '#lib/catalog/library.js';
	import { seriesStatuses } from '#lib/catalog/library.js';
	import { seasonName, seriesStatusName } from '#lib/i18n/series.js';
	import { workRoute } from '#lib/paths.js';
	import { reviewMaxLength } from '#lib/catalog/library.js';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { ratingLabel } from '#lib/i18n/ratings.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { LogFilm, LogSeason, LogTarget } from './log-target.js';
	import RatingInput from './RatingInput.svelte';
	import Select from '#lib/components/Select.svelte';

	interface Props {
		/** Set to open the dialog; reset to `null` when the dialog closes. */
		target: LogTarget | null;
		scale: RatingScale;
	}

	let { target = $bindable(), scale }: Props = $props();

	type ActionData = Record<string, unknown> | undefined;

	const noFilm: LogFilm = { id: '0', kind: 'film', title: '', year: null, posterPath: null };

	let dialog: HTMLDialogElement | undefined = $state();
	let entryId = $state<number | null>(null);
	let film = $state(noFilm);
	let watchedOn = $state('');
	let rating = $state<number | null>(null);
	let liked = $state(false);
	let rewatch = $state(false);
	let review = $state('');
	let containsSpoilers = $state(false);
	let tags = $state('');
	let season = $state('');
	let status = $state<SeriesStatus>('finished');
	let seasons = $state<LogSeason[]>([]);
	let error = $state<string | undefined>();

	const id = $props.id();
	const filmPath = $derived(resolve(workRoute(film.kind), { id: film.id }));
	const isSeries = $derived(film.kind === 'series');
	const seasonChoices = $derived(
		season === '' || seasons.some((entry) => String(entry.number) === season)
			? seasons
			: [...seasons, { number: Number(season), name: seasonName(Number(season)) }]
	);

	function today(): string {
		const now = new Date();
		const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
		return local.toISOString().slice(0, 10);
	}

	function load(entry: DiaryEntry) {
		entryId = entry.id;
		film = { ...entry.work, id: entry.work.externalId };
		({ watchedOn, rating, liked, rewatch, review, containsSpoilers } = entry);
		tags = entry.tags.join(', ');
		season = entry.season === null ? '' : String(entry.season);
	}

	$effect(() => {
		if (!target || !dialog || dialog.open) return;
		error = undefined;
		seasons = target.seasons ?? [];
		status = target.status ?? 'finished';
		if (target.kind === 'edit') {
			load(target.entry);
		} else {
			entryId = null;
			film = target.film;
			({ rating, liked, rewatch } = target.defaults);
			season = target.defaults.season == null ? '' : String(target.defaults.season);
			watchedOn = today();
			review = '';
			containsSpoilers = false;
			tags = '';
		}
		dialog.showModal();
	});

	/** Reloads the page data and closes the dialog after a success, or shows the error. */
	async function finish(result: ActionResult<ActionData, ActionData>) {
		if (result.type === 'success') {
			await refreshAll();
			dialog?.close();
		} else {
			const code = result.type === 'failure' ? result.data?.error : undefined;
			error = typeof code === 'string' ? code : 'generic';
		}
	}

	function confirmDeletion(event: SubmitEvent) {
		if (!confirm(m.log_delete_confirm())) event.preventDefault();
	}
</script>

<dialog bind:this={dialog} aria-labelledby="{id}-title" onclose={() => (target = null)}>
	<header>
		<h2 id="{id}-title">{entryId === null ? m.log_title_new() : m.log_title_edit()}</h2>
		<button
			class="close"
			type="button"
			aria-label={m.dialog_close()}
			onclick={() => dialog?.close()}
		>
			<Icon name="close" />
		</button>
	</header>

	<form
		id="{id}-form"
		method="POST"
		action="{filmPath}?/log"
		use:enhance={() =>
			async ({ result }) => {
				await finish(result);
			}}
	>
		{#if entryId !== null}
			<input type="hidden" name="entryId" value={entryId} />
		{/if}

		<div class="poster"><FilmPoster {film} size="medium" linked={false} /></div>

		<div class="fields">
			<p class="film">
				<span class="film-title">{film.title}</span>
				{#if film.year}<span class="film-year">{film.year}</span>{/if}
			</p>

			{#if error}
				<FormError message={errorMessage(error)} />
			{/if}

			<div class="when">
				<label class="date-label">
					{m.log_date()}
					<input class="date" type="date" name="watchedOn" bind:value={watchedOn} required />
				</label>
				<label class="check">
					<input type="checkbox" name="rewatch" bind:checked={rewatch} />
					{m.log_rewatch()}
				</label>
			</div>

			{#if isSeries}
				<div class="series">
					<div class="select-label">
						<label for="{id}-season">{m.log_season()}</label>
						<Select
							id="{id}-season"
							name="season"
							variant="well"
							bind:value={season}
							options={[
								{ value: '', label: m.log_season_all() },
								...seasonChoices.map((choice) => ({
									value: String(choice.number),
									label: choice.name
								}))
							]}
						/>
					</div>
					<div class="select-label">
						<label for="{id}-status">{m.log_status()}</label>
						<Select
							id="{id}-status"
							name="status"
							variant="well"
							bind:value={status}
							options={seriesStatuses.map((choice) => ({
								value: choice,
								label: seriesStatusName(choice)
							}))}
						/>
					</div>
				</div>
			{/if}

			<div class="review-box">
				<label class="sr-only" for="{id}-review">{m.log_review()}</label>
				<textarea
					class="light review"
					id="{id}-review"
					name="review"
					rows="7"
					maxlength={reviewMaxLength}
					placeholder={m.log_review_placeholder()}
					bind:value={review}></textarea>
				<label class="check spoilers" class:shown={review.trim() !== '' || containsSpoilers}>
					<input type="checkbox" name="containsSpoilers" bind:checked={containsSpoilers} />
					{m.log_spoilers()}
				</label>
			</div>

			<div class="bottom">
				<div class="group tags">
					<p class="group-head">
						<label for="{id}-tags">{m.log_tags()}</label>
						<span class="note">{m.log_tags_hint()}</span>
					</p>
					<input
						class="light"
						id="{id}-tags"
						type="text"
						name="tags"
						placeholder={m.log_tags_placeholder()}
						bind:value={tags}
						autocomplete="off"
					/>
				</div>
				<div class="group rating">
					<p class="group-head">
						<span>{m.log_rating()}</span>
						<span class="note">{rating === null ? '' : ratingLabel(rating, scale)}</span>
					</p>
					<RatingInput bind:value={rating} {scale} mode="field" />
				</div>
				<label class="group like" class:liked>
					<span>{m.log_like()}</span>
					<input class="sr-only" type="checkbox" name="liked" bind:checked={liked} />
					<Icon name="heart" filled />
				</label>
			</div>
		</div>
	</form>

	<footer>
		{#if entryId !== null}
			<form
				method="POST"
				action="{filmPath}?/deleteEntry"
				use:enhance={() =>
					async ({ result }) => {
						await finish(result);
					}}
				onsubmit={confirmDeletion}
			>
				<input type="hidden" name="entryId" value={entryId} />
				<button class="pill delete">{m.log_delete()}</button>
			</form>
		{/if}
		<button class="pill save" form="{id}-form">{m.log_save()}</button>
	</footer>
</dialog>

<style>
	dialog {
		width: min(100% - var(--space-8), var(--dialog-wide-width));
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

	header,
	footer {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-6);
	}

	header {
		border-bottom: 1px solid var(--color-dialog-divider);
	}

	footer {
		background: var(--color-dialog-footer);
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

	form[id] {
		display: grid;
		grid-template-columns: var(--poster-medium) minmax(0, 1fr);
		gap: var(--space-12);
		align-items: start;
		padding: var(--space-8) var(--space-12);
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.film-title {
		color: var(--color-heading);
		font-family: var(--font-display);
		font-size: var(--font-size-heading);
		font-weight: 900;
	}

	.film-year {
		margin-inline-start: var(--space-1);
		color: var(--color-text-panel);
		font-size: var(--font-size-large);
		font-weight: 300;
	}

	.when {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3) var(--space-8);
		align-items: center;
		justify-content: space-between;
	}

	.series {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3) var(--space-8);
	}

	.select-label,
	.date-label,
	.check {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		color: var(--color-text-strong);
	}

	.date {
		padding: var(--space-1) var(--space-2);
		border: 0;
		border-radius: var(--radius-small);
		background: var(--color-well);
		color: var(--color-heading);
		font: inherit;
	}

	.check input {
		display: grid;
		width: 1.25rem;
		height: 1.25rem;
		margin: 0;
		border-radius: var(--radius-small);
		appearance: none;
		background: var(--color-field-light);
		cursor: pointer;
		place-content: center;
	}

	.check input:checked::before {
		width: 0.7rem;
		height: 0.4rem;
		border-bottom: 2px solid var(--color-secondary);
		border-left: 2px solid var(--color-secondary);
		content: '';
		transform: translateY(-1px) rotate(-45deg);
	}

	.light {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: 0;
		border-radius: var(--radius-small);
		background: var(--color-field-light);
		color: var(--color-field-light-text);
		font: inherit;
	}

	.light::placeholder {
		color: var(--color-field-light-placeholder);
	}

	.light:focus {
		background: var(--color-input-focus);
		outline: none;
	}

	.review-box {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.review {
		display: block;
		resize: vertical;
		font-size: var(--font-size-body);
		line-height: var(--line-height-body);
	}

	.spoilers {
		display: none;
	}

	.spoilers.shown {
		display: flex;
	}

	.bottom {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4) var(--space-8);
		align-items: flex-start;
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.group-head {
		display: flex;
		gap: var(--space-3);
		align-items: baseline;
		justify-content: space-between;
		min-height: 1.5em;
		color: var(--color-heading);
	}

	.note {
		color: var(--color-text-panel);
		font-size: var(--font-size-control);
	}

	.tags {
		flex: 1;
		min-width: 14rem;
	}

	.rating :global(.input button) {
		color: var(--color-well);
	}

	.rating :global(.input button.on) {
		color: var(--color-highlight);
	}

	.like {
		align-items: center;
		color: var(--color-well);
		cursor: pointer;
	}

	.like span {
		min-height: 1.5em;
		color: var(--color-heading);
	}

	.like :global(svg) {
		font-size: var(--font-size-rating-input);
	}

	.like.liked {
		color: var(--color-like);
	}

	.like:has(:focus-visible) {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.pill {
		padding: var(--space-2) var(--space-4);
		border: 0;
		border-radius: var(--radius-pill);
		box-shadow: var(--shadow-button);
		color: var(--color-accent-contrast);
		font-family: inherit;
		font-size: var(--font-size-body);
		font-weight: 700;
		cursor: pointer;
	}

	.save {
		margin-inline-start: auto;
		background: var(--color-accent);
	}

	.save:hover {
		background: var(--color-accent-hover);
	}

	.delete {
		background: var(--color-danger-button);
	}

	.delete:hover {
		background: var(--color-danger-button-hover);
	}

	@media (max-width: 40rem) {
		form[id] {
			grid-template-columns: minmax(0, 1fr);
			gap: var(--space-4);
			padding: var(--space-4);
		}

		.poster {
			display: none;
		}
	}
</style>
