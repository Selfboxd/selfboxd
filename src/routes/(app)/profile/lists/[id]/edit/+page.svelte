<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import { listNoteMaxLength, type ListItem } from '#lib/catalog/library.js';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import FormNotice from '#lib/components/FormNotice.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import ListForm from '#lib/components/library/ListForm.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const list = $derived(data.list);

	let items: ListItem[] = $derived(data.list.items);
	let dragged = $state<number | null>(null);
	let orderForm: HTMLFormElement | undefined = $state();

	const order = $derived(items.map((item) => item.work.id).join(','));

	function move(workId: number, index: number) {
		const from = items.findIndex((item) => item.work.id === workId);
		const item = items[from];
		if (!item || from === index || index < 0 || index >= items.length) return false;
		const next = items.filter((other) => other !== item);
		next.splice(index, 0, item);
		items = next;
		return true;
	}

	async function persist() {
		await tick();
		orderForm?.requestSubmit();
	}

	function startDrag(event: DragEvent, workId: number) {
		dragged = workId;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', String(workId));
		}
	}

	function dragOver(event: DragEvent, index: number) {
		if (dragged === null) return;
		event.preventDefault();
		move(dragged, index);
	}

	function endDrag() {
		if (dragged === null) return;
		dragged = null;
		void persist();
	}

	function moveWithKeyboard(event: KeyboardEvent, workId: number, index: number) {
		const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
		if (step === 0) return;
		event.preventDefault();
		if (move(workId, index + step)) void persist();
	}

	function confirmDeletion(event: SubmitEvent) {
		if (!confirm(m.list_delete_confirm())) event.preventDefault();
	}
</script>

<svelte:head>
	<title>{m.list_edit_title()} - Selfboxd</title>
</svelte:head>

<h1 class="page-title">{m.list_edit_title()}</h1>

<div class="split">
	<div class="items">
		<h2 class="section-title">{list.name}</h2>
		{#if items.length === 0}
			<p>{m.list_empty()}</p>
		{:else}
			<p class="hint">{m.list_reorder_hint()}</p>
			<form method="POST" action="?/reorder" bind:this={orderForm} use:enhance>
				<input type="hidden" name="order" value={order} />
			</form>
			<ol>
				{#each items as { work, note }, index (work.id)}
					<li
						class:dragging={dragged === work.id}
						draggable="true"
						ondragstart={(event) => {
							startDrag(event, work.id);
						}}
						ondragover={(event) => {
							dragOver(event, index);
						}}
						ondragend={endDrag}
					>
						<button
							class="handle"
							type="button"
							aria-label={m.list_item_move({ title: work.title })}
							onkeydown={(event) => {
								moveWithKeyboard(event, work.id, index);
							}}
						>
							<Icon name="grip" />
						</button>
						{#if list.ranked}<span class="rank">{index + 1}</span>{/if}
						<FilmPoster film={{ ...work, id: work.externalId }} size="tiny" linked={false} />
						<div class="item">
							<p class="title">
								{work.title}
								{#if work.year}<span class="year">{work.year}</span>{/if}
							</p>
							<form method="POST" action="?/note" use:enhance>
								<input type="hidden" name="workId" value={work.id} />
								<input
									class="note"
									type="text"
									name="note"
									defaultValue={note}
									maxlength={listNoteMaxLength}
									aria-label={m.list_item_note({ title: work.title })}
									placeholder={m.watchlist_note()}
									autocomplete="off"
									onchange={(event) => event.currentTarget.form?.requestSubmit()}
								/>
							</form>
						</div>
						<form method="POST" action="?/remove" use:enhance>
							<input type="hidden" name="workId" value={work.id} />
							<button class="remove" aria-label={m.list_item_remove({ title: work.title })}>
								<Icon name="close" />
							</button>
						</form>
					</li>
				{/each}
			</ol>
		{/if}
	</div>

	<aside>
		<form
			class="form"
			method="POST"
			action="?/save"
			use:enhance={() =>
				({ update }) =>
					update({ reset: false })}
		>
			{#if form && 'error' in form}
				<FormError message={errorMessage(form.error)} />
			{:else if form?.saved}
				<FormNotice message={m.list_saved()} />
			{/if}
			<ListForm initial={list} />
			<button class="button button-primary">{m.log_save()}</button>
		</form>
		<a class="back" href={resolve('/(app)/profile/lists/[id]', { id: String(list.id) })}>
			{m.list_back()}
		</a>
		<form method="POST" action="?/delete" onsubmit={confirmDeletion}>
			<button class="button button-danger">{m.list_delete()}</button>
		</form>
	</aside>
</div>

<style>
	.split {
		grid-template-columns: minmax(0, 1fr) 20rem;
	}

	aside {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		align-items: flex-start;
	}

	ol {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.hint {
		margin-bottom: var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--font-size-control);
	}

	li {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--color-border-subtle);
		transition: opacity var(--duration-fast);
	}

	.dragging {
		opacity: 0.4;
	}

	.handle,
	.remove {
		display: flex;
		padding: var(--space-1);
		border: 0;
		background: none;
		color: var(--color-text-muted);
		font-size: var(--font-size-large);
	}

	.handle {
		cursor: grab;
	}

	.handle :global(.icon) {
		stroke-width: 3;
	}

	.remove {
		opacity: 0;
		cursor: pointer;
		transition: opacity var(--duration-fast);
	}

	li:hover .remove,
	.remove:focus-visible {
		opacity: 1;
	}

	.handle:hover,
	.remove:hover {
		color: var(--color-heading);
	}

	.rank {
		min-width: 1.5em;
		color: var(--color-text-strong);
		font-weight: 700;
		text-align: end;
	}

	.item {
		flex: 1;
		min-width: 0;
	}

	.title {
		color: var(--color-heading);
		font-weight: 700;
	}

	.year {
		color: var(--color-text);
		font-weight: 400;
	}

	.note {
		width: 100%;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-text);
		font: inherit;
		font-size: var(--font-size-control);
	}

	.note::placeholder {
		color: var(--color-text-muted);
	}

	.note:focus {
		color: var(--color-heading);
		outline: none;
	}

	@media (max-width: 40rem) {
		.split {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
