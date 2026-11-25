<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/Icon.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import { watchlistNoteMaxLength } from '#lib/catalog/library.js';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		/** Set to `true` to open the dialog; reset when the dialog closes. */
		open: boolean;
		/** Current note and tags of the work, or `null` when it is not on the watchlist. */
		current: { note: string; tags: string[] } | null;
		/** Error code returned by the last submission of the form, if any. */
		error?: string | undefined;
	}

	let { open = $bindable(), current, error }: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let note = $state('');
	let tags = $state('');
	let listed = $state(false);

	const id = $props.id();

	$effect(() => {
		if (!open || !dialog || dialog.open) return;
		listed = current !== null;
		note = current?.note ?? '';
		tags = current?.tags.join(', ') ?? '';
		dialog.showModal();
	});
</script>

<dialog bind:this={dialog} aria-labelledby="{id}-title" onclose={() => (open = false)}>
	<header>
		<h2 id="{id}-title">{m.watchlist_dialog_title()}</h2>
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
		method="POST"
		action="?/watchlist"
		use:enhance={() =>
			async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') dialog?.close();
			}}
	>
		<input type="hidden" name="listed" value="true" />
		{#if error}
			<FormError message={errorMessage(error)} />
		{/if}
		<div class="field">
			<label class="field-label" for="{id}-note">{m.watchlist_note()}</label>
			<textarea
				class="field-input"
				id="{id}-note"
				name="note"
				rows="3"
				maxlength={watchlistNoteMaxLength}
				bind:value={note}></textarea>
			<span class="field-hint">{m.watchlist_note_hint()}</span>
		</div>
		<div class="field">
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
		<button class="button button-primary">{listed ? m.log_save() : m.watchlist_add()}</button>
	</form>
</dialog>

<style>
	dialog {
		width: min(100% - var(--space-8), var(--narrow-width));
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
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-dialog-divider);
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

	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		align-items: flex-start;
		padding: var(--space-4);
	}

	textarea {
		resize: vertical;
	}
</style>
