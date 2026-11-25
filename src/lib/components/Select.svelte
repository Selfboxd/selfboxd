<script lang="ts" generics="T extends string">
	import Icon from '#lib/components/Icon.svelte';

	interface Option {
		value: T;
		label: string;
	}

	interface Props {
		/** Identifier of the trigger, for a `label` that points at it. */
		id: string;
		/** Name of the field sent with the form. */
		name: string;
		value: T;
		options: Option[];
		/** Look of the trigger: a form field, or a dark well inside a dialog. */
		variant?: 'field' | 'well';
	}

	let { id, name, value = $bindable(), options, variant = 'field' }: Props = $props();

	let open = $state(false);
	let active = $state(0);
	let root: HTMLElement | undefined = $state();
	let trigger: HTMLButtonElement | undefined = $state();

	const current = $derived(options.find((option) => option.value === value));

	function show() {
		active = Math.max(
			0,
			options.findIndex((option) => option.value === value)
		);
		open = true;
	}

	function choose(choice: T) {
		value = choice;
		open = false;
		trigger?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		const last = options.length - 1;
		if (!open) {
			if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
				event.preventDefault();
				show();
			}
			return;
		}
		const moves: Record<string, number> = {
			ArrowDown: Math.min(active + 1, last),
			ArrowUp: Math.max(active - 1, 0),
			Home: 0,
			End: last
		};
		if (event.key in moves) {
			event.preventDefault();
			active = moves[event.key] ?? active;
		} else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			const option = options[active];
			if (option) choose(option.value);
		} else if (event.key === 'Escape' || event.key === 'Tab') {
			open = false;
		}
	}

	function closeOnOutsideClick(event: MouseEvent) {
		if (open && root && event.target instanceof Node && !root.contains(event.target)) {
			open = false;
		}
	}
</script>

<svelte:window onclick={closeOnOutsideClick} />

<div class="select {variant}" class:open bind:this={root}>
	<input type="hidden" {name} {value} />
	<button
		{id}
		class="trigger"
		type="button"
		role="combobox"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls="{id}-options"
		aria-activedescendant={open ? `${id}-option-${String(active)}` : undefined}
		bind:this={trigger}
		onclick={() => {
			if (open) open = false;
			else show();
		}}
		{onkeydown}
	>
		<span class="current">{current?.label ?? ''}</span>
		<Icon name="chevron" />
	</button>
	{#if open}
		<ul class="options" id="{id}-options" role="listbox" aria-labelledby={id}>
			{#each options as option, index (option.value)}
				<li role="none">
					<button
						id="{id}-option-{index}"
						type="button"
						role="option"
						tabindex="-1"
						aria-selected={option.value === value}
						class:active={index === active}
						onmousemove={() => (active = index)}
						onclick={() => {
							choose(option.value);
						}}
					>
						{option.label}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.select {
		position: relative;
		display: inline-block;
		min-width: var(--select-min-width);
	}

	.field {
		display: block;
	}

	.trigger {
		display: flex;
		width: 100%;
		gap: var(--space-2);
		align-items: center;
		justify-content: space-between;
		border: 0;
		border-radius: var(--radius-small);
		font: inherit;
		text-align: start;
		cursor: pointer;
	}

	.field .trigger {
		padding: var(--space-2) var(--space-3);
		background: var(--color-input);
		box-shadow: var(--shadow-input);
		color: var(--color-input-text);
	}

	.well .trigger {
		padding: var(--space-1) var(--space-2);
		background: var(--color-well);
		color: var(--color-heading);
	}

	.trigger:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 1px;
	}

	.trigger :global(.icon) {
		flex-shrink: 0;
		transition: transform var(--duration-fast);
	}

	.open .trigger :global(.icon) {
		transform: rotate(180deg);
	}

	.current {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.options {
		position: absolute;
		z-index: 30;
		top: calc(100% + 2px);
		left: 0;
		overflow-y: auto;
		min-width: 100%;
		max-height: var(--select-max-height);
		margin: 0;
		padding: var(--space-1) 0;
		border-radius: var(--radius-small);
		background: var(--color-menu);
		box-shadow: var(--shadow-button), var(--shadow-menu);
		list-style: none;
	}

	.options button {
		display: block;
		width: 100%;
		padding: var(--space-1) var(--space-3);
		border: 0;
		background: none;
		color: var(--color-menu-text);
		font: inherit;
		text-align: start;
		white-space: nowrap;
		cursor: pointer;
	}

	.options button.active,
	.options button[aria-selected='true'] {
		background: var(--color-menu-hover);
		color: var(--color-heading);
	}
</style>
