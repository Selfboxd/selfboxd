<script lang="ts" generics="T extends string">
	interface Props {
		/** Name of the field sent with the form. */
		name: string;
		/** What the choice is about, read out for the group. */
		label: string;
		options: { value: T; label: string }[];
		value: T;
	}

	let { name, label, options, value = $bindable() }: Props = $props();
</script>

<div class="choices" role="radiogroup" aria-label={label}>
	{#each options as option (option.value)}
		<label class:on={value === option.value}>
			<input type="radio" {name} value={option.value} bind:group={value} />
			{option.label}
		</label>
	{/each}
</div>

<style>
	.choices {
		display: inline-flex;
		flex-wrap: wrap;
		overflow: hidden;
		border-radius: var(--radius-small);
		background: var(--color-input);
		box-shadow: var(--shadow-input);
	}

	label {
		position: relative;
		padding: var(--space-1) var(--space-3);
		color: var(--color-text);
		font-size: var(--font-size-control);
		cursor: pointer;
	}

	label + label {
		border-inline-start: 1px solid var(--color-background);
	}

	label:hover {
		color: var(--color-heading);
	}

	label.on {
		background: var(--color-secondary);
		color: var(--color-heading);
	}

	label:has(:focus-visible) {
		outline: 2px solid var(--color-focus);
		outline-offset: -2px;
	}

	input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}
</style>
