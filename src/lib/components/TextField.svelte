<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		/** Name of the form field. */
		name: string;
		/** Text shown above the input. */
		label: string;
		/** Optional help text shown below the input. */
		hint?: string;
	}

	let { name, label, hint, type = 'text', ...rest }: Props = $props();

	const id = $props.id();
	const hintId = `${id}-hint`;
</script>

<div class="field">
	<label class="field-label" for={id}>{label}</label>
	<input
		class="field-input"
		{id}
		{name}
		{type}
		required
		aria-describedby={hint ? hintId : undefined}
		{...rest}
	/>
	{#if hint}
		<span class="field-hint" id={hintId}>{hint}</span>
	{/if}
</div>
