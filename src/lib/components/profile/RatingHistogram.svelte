<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import type { RatingScale } from '#lib/catalog/library.js';
	import { ratingLabel } from '#lib/i18n/ratings.js';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		/** Number of works for each rating, from the lowest rating to the highest. */
		counts: number[];
		scale: RatingScale;
	}

	let { counts, scale }: Props = $props();

	const barWidth = 9;
	const barGap = 1;
	const height = 40;
	const minimum = 1;

	const highest = $derived(Math.max(1, ...counts));
	const bars = $derived(
		counts.map((count, index) => {
			const size = Math.max(minimum, (count / highest) * height);
			return {
				x: index * (barWidth + barGap),
				y: height - size,
				size,
				label: m.histogram_bar({ rating: ratingLabel(index + 1, scale), count })
			};
		})
	);
</script>

<div class="histogram">
	<span class="low"><Icon name="star" filled /></span>
	<svg
		viewBox="0 0 {counts.length * (barWidth + barGap) - barGap} {height}"
		preserveAspectRatio="none"
		role="img"
		aria-label={m.profile_ratings()}
	>
		{#each bars as bar (bar.x)}
			<rect x={bar.x} y={bar.y} width={barWidth} height={bar.size}><title>{bar.label}</title></rect>
		{/each}
	</svg>
	<span class="high">
		{#each [1, 2, 3, 4, 5] as star (star)}<Icon name="star" filled />{/each}
	</span>
</div>

<style>
	.histogram {
		display: flex;
		gap: var(--space-1);
		align-items: flex-end;
		color: var(--color-rating);
		font-size: var(--font-size-micro);
	}

	.low,
	.high {
		display: flex;
		flex-shrink: 0;
	}

	svg {
		display: block;
		flex: 1;
		min-width: 0;
		height: var(--histogram-height);
	}

	rect {
		fill: var(--color-surface-raised);
		transition: fill var(--duration-fast);
	}

	rect:hover {
		fill: var(--color-text);
	}
</style>
