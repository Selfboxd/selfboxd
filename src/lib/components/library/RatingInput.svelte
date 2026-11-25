<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import { ratingMax, type RatingScale } from '#lib/catalog/library.js';
	import { ratingLabel } from '#lib/i18n/ratings.js';

	interface Props {
		/** Current rating, from 1 to 10, or `null` without rating. */
		value: number | null;
		scale: RatingScale;
		/**
		 * `submit` makes each choice submit the surrounding form with a `rating` field.
		 * `field` only updates a hidden `rating` field of the surrounding form.
		 */
		mode: 'submit' | 'field';
		/** Called in `field` mode with the new rating each time one is chosen. */
		onchoose?: (rating: number | null) => void;
	}

	let { value = $bindable(), scale, mode, onchoose }: Props = $props();

	let hovered = $state<number | null>(null);

	const shown = $derived(hovered ?? value ?? 0);
	const steps = Array.from({ length: ratingMax }, (_, index) => index + 1);

	function choose(step: number) {
		if (mode !== 'field') return;
		value = step === value ? null : step;
		onchoose?.(value);
	}
</script>

<div class="input {scale}" role="group" onmouseleave={() => (hovered = null)}>
	{#if mode === 'field'}
		<input type="hidden" name="rating" value={value ?? ''} />
	{/if}
	{#each steps as step (step)}
		<button
			type={mode === 'submit' ? 'submit' : 'button'}
			name={mode === 'submit' ? 'rating' : undefined}
			value={step}
			class:on={step <= shown}
			class:half={step % 2 === 1}
			aria-label={ratingLabel(step, scale)}
			aria-pressed={step === value}
			onmouseenter={() => (hovered = step)}
			onfocus={() => (hovered = step)}
			onblur={() => (hovered = null)}
			onclick={() => {
				choose(step);
			}}
		>
			{#if scale === 'stars'}
				<Icon name="star" filled />
			{:else}
				{step}
			{/if}
		</button>
	{/each}
</div>

<style>
	.input {
		display: inline-flex;
	}

	button {
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-rating-empty);
		font-family: inherit;
		cursor: pointer;
		transition:
			color var(--duration-fast),
			background-color var(--duration-fast);
	}

	button.on {
		color: var(--color-rating);
	}

	.stars button {
		overflow: hidden;
		width: 0.5em;
		font-size: var(--rating-size, var(--font-size-rating-input));
		line-height: 1;
	}

	.stars button :global(svg) {
		display: block;
	}

	.stars button:not(.half) :global(svg) {
		margin-inline-start: -0.5em;
	}

	.ten {
		gap: var(--space-1);
	}

	.ten button {
		min-width: 1.5em;
		padding: var(--space-1) 0;
		border-radius: var(--radius-small);
		background: var(--color-chip);
		font-size: var(--font-size-control);
		font-weight: 700;
	}

	.ten button.on {
		background: var(--color-rating);
		color: var(--color-accent-contrast);
	}
</style>
