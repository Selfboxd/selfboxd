<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		/** Set to `true` to open the dialog; reset when the dialog closes. */
		open: boolean;
		/** Form action adding the works, relative to the page. */
		action: string;
		/** Every list of the account. */
		lists: { id: number; name: string }[];
		/** Name offered for a new list. */
		name: string;
	}

	let { open = $bindable(), action, lists, name }: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let choice = $state('new');

	const id = $props.id();

	$effect(() => {
		if (open && dialog && !dialog.open) dialog.showModal();
	});
</script>

<dialog bind:this={dialog} aria-labelledby="{id}-title" onclose={() => (open = false)}>
	<header>
		<h2 id="{id}-title">{m.add_to_list_title()}</h2>
		<button
			class="close"
			type="button"
			aria-label={m.dialog_close()}
			onclick={() => dialog?.close()}
		>
			<Icon name="close" />
		</button>
	</header>

	<form method="POST" {action}>
		<ul>
			<li>
				<label>
					<input type="radio" name="list" value="new" bind:group={choice} />
					{m.add_to_list_new()}
				</label>
				{#if choice === 'new'}
					<input
						class="name"
						type="text"
						name="name"
						value={name}
						maxlength="100"
						aria-label={m.add_to_list_name()}
					/>
				{/if}
			</li>
			{#each lists as list (list.id)}
				<li>
					<label>
						<input type="radio" name="list" value={String(list.id)} bind:group={choice} />
						{list.name}
					</label>
				</li>
			{/each}
		</ul>
		<div class="footer">
			<button class="button button-primary">{m.add_to_list_add()}</button>
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

	.name {
		width: 100%;
		margin-bottom: var(--space-2);
	}

	.footer {
		display: flex;
		justify-content: flex-end;
	}
</style>
