<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import type { RatingScale } from '#lib/catalog/library.js';
	import { ratingLabel } from '#lib/i18n/ratings.js';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';

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

	let active = $state<number | null>(null);

	const total = $derived(counts.reduce((sum, count) => sum + count, 0));
	const highest = $derived(Math.max(1, ...counts));
	const percent = new Intl.NumberFormat(getLocale(), { style: 'percent' });
	const bars = $derived(
		counts.map((count, index) => {
			const size = Math.max(minimum, (count / highest) * height);
			return {
				index,
				x: index * (barWidth + barGap),
				y: height - size,
				size,
				count,
				rating: index + 1,
				share: percent.format(total === 0 ? 0 : count / total)
			};
		})
	);
</script>

<div class="histogram">
	<span class="low"><Icon name="star" filled /></span>
	<div class="chart">
		<svg
			viewBox="0 0 {counts.length * (barWidth + barGap) - barGap} {height}"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			{#each bars as bar (bar.index)}
				<rect
					class:active={active === bar.index}
					x={bar.x}
					y={bar.y}
					width={barWidth}
					height={bar.size}
				/>
			{/each}
		</svg>
		<ul class="columns" aria-label={m.profile_ratings()}>
			{#each bars as bar (bar.index)}
				<li>
					<button
						type="button"
						aria-label={m.histogram_bar({
							rating: ratingLabel(bar.rating, scale),
							count: bar.count
						})}
						onmouseenter={() => (active = bar.index)}
						onmouseleave={() => (active = null)}
						onfocus={() => (active = bar.index)}
						onblur={() => (active = null)}
					></button>
					{#if active === bar.index}
						<span class="tip" aria-hidden="true">
							<strong>{bar.count}</strong>
							{#if scale === 'stars'}
								<span class="stars">
									{#each Array.from({ length: Math.floor(bar.rating / 2) }, (_, star) => star) as star (star)}
										<Icon name="star" filled />
									{/each}{#if bar.rating % 2 === 1}½{/if}
								</span>
							{:else}
								<span class="stars">{bar.rating}/10</span>
							{/if}
							{m.histogram_ratings({ percent: bar.share })}
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
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

	.chart {
		position: relative;
		flex: 1;
		min-width: 0;
		height: var(--histogram-height);
	}

	svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	rect {
		fill: var(--color-surface-raised);
		transition: fill var(--duration-fast);
	}

	rect.active {
		fill: var(--color-text-muted);
	}

	.columns {
		position: absolute;
		inset: 0;
		display: grid;
		grid-auto-columns: 1fr;
		grid-auto-flow: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.columns li {
		position: relative;
	}

	.columns button {
		display: block;
		width: 100%;
		height: 100%;
		padding: 0;
		border: 0;
		background: none;
		cursor: default;
	}

	.columns button:focus-visible {
		outline: 1px solid var(--color-focus);
	}

	.tip {
		position: absolute;
		z-index: 5;
		bottom: calc(100% + var(--space-2));
		left: 50%;
		display: flex;
		gap: var(--space-1);
		align-items: center;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-tooltip);
		box-shadow: var(--shadow-menu);
		color: var(--color-heading);
		font-size: var(--font-size-small);
		white-space: nowrap;
		pointer-events: none;
		transform: translateX(-50%);
	}

	.tip::after {
		position: absolute;
		top: 100%;
		left: 50%;
		border: var(--space-1) solid transparent;
		border-top-color: var(--color-tooltip);
		content: '';
		transform: translateX(-50%);
	}

	.stars {
		display: inline-flex;
		color: var(--color-text-strong);
	}
</style>
