<script lang="ts">
	import { enhance } from '$app/forms';
	import { refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { WorkKind } from '#lib/catalog/library.js';
	import Icon from '#lib/components/Icon.svelte';
	import { workRoute } from '#lib/paths.js';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		/** Set to `true` to open the dialog; reset when the dialog closes. */
		open: boolean;
		/** Identifier of the film or series at TMDB. */
		filmId: string;
		kind?: WorkKind;
		/** Every list of the account. */
		lists: { id: number; name: string }[];
		/** Identifiers of the lists that hold the film. */
		member: number[];
	}

	let { open = $bindable(), filmId, kind = 'film', lists, member }: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	const id = $props.id();

	$effect(() => {
		if (open && dialog && !dialog.open) dialog.showModal();
	});
</script>

<dialog bind:this={dialog} aria-labelledby="{id}-title" onclose={() => (open = false)}>
	<header>
		<h2 id="{id}-title">{m.lists_dialog_title()}</h2>
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
		action="{resolve(workRoute(kind), { id: filmId })}?/lists"
		use:enhance={() =>
			async ({ result }) => {
				if (result.type !== 'success') return;
				await refreshAll();
				dialog?.close();
			}}
	>
		{#if lists.length === 0}
			<p>{m.lists_empty()}</p>
		{:else}
			<ul>
				{#each lists as list (list.id)}
					<li>
						<label>
							<input
								type="checkbox"
								name="listId"
								value={list.id}
								checked={member.includes(list.id)}
							/>
							{list.name}
						</label>
					</li>
				{/each}
			</ul>
		{/if}
		<div class="footer">
			<a href={resolve('/(app)/profile/lists/new')}>{m.lists_new()}</a>
			{#if lists.length > 0}
				<button class="button button-primary">{m.log_save()}</button>
			{/if}
		</div>
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
		font-size: var(--font-size-large);
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

	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-4);
	}

	ul {
		overflow-y: auto;
		max-height: 50vh;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	label {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-1) 0;
		cursor: pointer;
	}

	.footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
</style>
