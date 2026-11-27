<script lang="ts">
	import Tooltip from '#lib/components/Tooltip.svelte';

	interface Bar {
		label: string;
		value: number;
		/** What the tooltip of the bar says. */
		tip: string;
		/** Page the bar opens, when there is one. */
		href?: string | null;
	}

	interface Props {
		bars: Bar[];
		/** Name of the chart, read out for the list of bars. */
		label: string;
		/** Shows every label under the bars instead of a few. */
		allLabels?: boolean;
	}

	let { bars, label, allLabels = false }: Props = $props();

	let active = $state<number | null>(null);

	const highest = $derived(Math.max(1, ...bars.map((bar) => bar.value)));
	/** Height of each bar out of 100, a sliver for an empty one so that the axis stays readable. */
	const heights = $derived(
		bars.map((bar) => (bar.value <= 0 ? 1.5 : Math.max(4, (bar.value / highest) * 100)))
	);
	const ticks = $derived.by(() => {
		if (allLabels || bars.length <= 12) return new Set(bars.map((_, index) => index));
		const step = Math.ceil(bars.length / 7);
		return new Set(
			bars
				.map((_, index) => index)
				.filter((index) => index % step === 0 || index === bars.length - 1)
		);
	});
</script>

<div class="chart">
	<ol class="bars" aria-label={label}>
		{#each bars as bar, index (index)}
			<li
				class:active={active === index}
				onpointerenter={() => (active = index)}
				onpointerleave={() => (active = null)}
			>
				{#if active === index}<Tooltip>{bar.tip}</Tooltip>{/if}
				{#if bar.href}
					<!-- eslint-disable svelte/no-navigation-without-resolve -- built by the page from resolved routes -->
					<a
						href={bar.href}
						aria-label={bar.tip}
						onfocus={() => (active = index)}
						onblur={() => (active = null)}
					>
						<svg viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true">
							<rect x="0" y={100 - (heights[index] ?? 0)} width="10" height={heights[index]} />
						</svg>
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{:else}
					<span class="bar" role="img" aria-label={bar.tip}>
						<svg viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true">
							<rect x="0" y={100 - (heights[index] ?? 0)} width="10" height={heights[index]} />
						</svg>
					</span>
				{/if}
			</li>
		{/each}
	</ol>
	<ol class="labels" aria-hidden="true">
		{#each bars as bar, index (index)}
			<li>{ticks.has(index) ? bar.label : ''}</li>
		{/each}
	</ol>
</div>

<style>
	.bars,
	.labels {
		display: grid;
		grid-auto-columns: minmax(0, var(--stats-bar-max));
		grid-auto-flow: column;
		gap: var(--stats-bar-gap);
		justify-content: center;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.bars {
		height: var(--stats-chart-height);
		align-items: end;
	}

	.bars li {
		position: relative;
		height: 100%;
	}

	a,
	.bar {
		position: absolute;
		display: block;
		inset: 0;
	}

	svg {
		position: absolute;
		display: block;
		width: 100%;
		height: 100%;
		inset: 0;
	}

	rect {
		fill: var(--color-stat-bar);
		transition: fill var(--duration-fast);
	}

	.active rect {
		fill: var(--color-stat-bar-hover);
	}

	a:focus-visible {
		outline: 1px solid var(--color-focus);
		outline-offset: 2px;
	}

	.labels {
		margin-top: var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--font-size-micro);
		letter-spacing: var(--letter-spacing-caps);
		text-align: center;
	}

	.labels li {
		overflow: visible;
		white-space: nowrap;
	}
</style>
