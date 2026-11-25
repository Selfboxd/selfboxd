<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/Icon.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import type { DiaryEntry, RatingScale } from '#lib/catalog/library.js';
	import { reviewMaxLength } from '#lib/catalog/library.js';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { LogTarget } from './log-target.js';
	import RatingInput from './RatingInput.svelte';

	interface Props {
		/** Set to open the dialog; reset to `null` when the dialog closes. */
		target: LogTarget | null;
		scale: RatingScale;
		/** Error code returned by the last submission of the form, if any. */
		error?: string | undefined;
	}

	let { target = $bindable(), scale, error }: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let entryId = $state<number | null>(null);
	let title = $state('');
	let year = $state<number | null>(null);
	let watchedOn = $state('');
	let rating = $state<number | null>(null);
	let liked = $state(false);
	let rewatch = $state(false);
	let review = $state('');
	let containsSpoilers = $state(false);
	let tags = $state('');

	const id = $props.id();

	function today(): string {
		const now = new Date();
		const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
		return local.toISOString().slice(0, 10);
	}

	function load(entry: DiaryEntry) {
		entryId = entry.id;
		({ title, year } = entry.work);
		({ watchedOn, rating, liked, rewatch, review, containsSpoilers } = entry);
		tags = entry.tags.join(', ');
	}

	$effect(() => {
		if (!target || !dialog || dialog.open) return;
		if (target.kind === 'edit') {
			load(target.entry);
		} else {
			entryId = null;
			({ title, year, rating, liked, rewatch } = target.defaults);
			watchedOn = today();
			review = '';
			containsSpoilers = false;
			tags = '';
		}
		dialog.showModal();
	});

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
		action="?/log"
		use:enhance={() =>
			async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') dialog?.close();
			}}
	>
		{#if entryId !== null}
			<input type="hidden" name="entryId" value={entryId} />
		{/if}

		<p class="film">
			<span class="film-title">{title}</span>
			{#if year}<span class="film-year">{year}</span>{/if}
		</p>

		{#if error}
			<FormError message={errorMessage(error)} />
		{/if}

		<div class="row">
			<label class="inline" for="{id}-date">{m.log_date()}</label>
			<input
				class="field-input date"
				id="{id}-date"
				type="date"
				name="watchedOn"
				bind:value={watchedOn}
				required
			/>
			<label class="check">
				<input type="checkbox" name="rewatch" bind:checked={rewatch} />
				{m.log_rewatch()}
			</label>
		</div>

		<label class="sr-only" for="{id}-review">{m.log_review()}</label>
		<textarea
			class="field-input review"
			id="{id}-review"
			name="review"
			rows="6"
			maxlength={reviewMaxLength}
			placeholder={m.log_review_placeholder()}
			bind:value={review}></textarea>
		<label class="check">
			<input type="checkbox" name="containsSpoilers" bind:checked={containsSpoilers} />
			{m.log_spoilers()}
		</label>

		<div class="row bottom">
			<div class="field tags">
				<label class="field-label" for="{id}-tags">{m.log_tags()}</label>
				<input
					class="field-input"
					id="{id}-tags"
					type="text"
					name="tags"
					bind:value={tags}
					autocomplete="off"
				/>
				<span class="field-hint">{m.log_tags_hint()}</span>
			</div>
			<div class="field rating">
				<span class="field-label">{m.log_rating()}</span>
				<RatingInput bind:value={rating} {scale} mode="field" />
			</div>
			<label class="like" class:liked>
				<input class="sr-only" type="checkbox" name="liked" bind:checked={liked} />
				<Icon name="heart" filled />
				<span>{m.log_like()}</span>
			</label>
		</div>
	</form>

	<footer>
		{#if entryId !== null}
			<form
				method="POST"
				action="?/deleteEntry"
				use:enhance={() =>
					async ({ result, update }) => {
						await update();
						if (result.type === 'success') dialog?.close();
					}}
				onsubmit={confirmDeletion}
			>
				<input type="hidden" name="entryId" value={entryId} />
				<button class="button button-danger">{m.log_delete()}</button>
			</form>
		{/if}
		<button class="button button-primary save" form="{id}-form">{m.log_save()}</button>
	</footer>
</dialog>

<style>
	dialog {
		width: min(100% - var(--space-8), var(--dialog-width));
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
		padding: var(--space-3) var(--space-4);
	}

	header {
		border-bottom: 1px solid var(--color-dialog-divider);
	}

	footer {
		border-top: 1px solid var(--color-dialog-divider);
	}

	h2 {
		color: var(--color-text-strong);
		font-family: var(--font-body);
		font-size: var(--font-size-large);
		font-weight: 400;
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

	.close:hover {
		color: var(--color-heading);
	}

	form[id] {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
	}

	.film-title {
		color: var(--color-heading);
		font-family: var(--font-heading);
		font-size: var(--font-size-heading);
		font-weight: 700;
	}

	.film-year {
		margin-inline-start: var(--space-1);
		font-size: var(--font-size-large);
		font-weight: 300;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		align-items: center;
	}

	.bottom {
		align-items: flex-start;
	}

	.date {
		width: auto;
	}

	.check {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		font-size: var(--font-size-control);
	}

	.review {
		resize: vertical;
		font-family: var(--font-heading);
		font-size: var(--font-size-prose);
	}

	.tags {
		flex: 1;
		min-width: 12rem;
	}

	.rating {
		width: auto;
	}

	.like {
		display: flex;
		flex-direction: column;
		align-items: center;
		color: var(--color-like-empty);
		font-size: var(--font-size-control);
		cursor: pointer;
	}

	.like :global(svg) {
		font-size: var(--font-size-rating-input);
	}

	.like span {
		color: var(--color-text-strong);
	}

	.like.liked {
		color: var(--color-like);
	}

	.like:has(:focus-visible) {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.save {
		margin-inline-start: auto;
	}
</style>
