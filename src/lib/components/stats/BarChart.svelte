<script lang="ts">
	interface Bar {
		label: string;
		value: number;
		/** What the tooltip of the bar says. */
		tip: string;
	}

	interface Props {
		bars: Bar[];
		/** Name of the chart, read out for the list of bars. */
		label: string;
		/** Whether the bars light up in the accent colour. */
		accent?: boolean;
	}

	let { bars, label, accent = false }: Props = $props();

	const barWidth = 9;
	const barGap = 2;
	const height = 60;
	const minimum = 0.5;

	let active = $state<number | null>(null);

	const highest = $derived(Math.max(1, ...bars.map((bar) => bar.value)));
	const shapes = $derived(
		bars.map((bar, index) => {
			const size = bar.value === 0 ? minimum : Math.max(1.5, (bar.value / highest) * height);
			return { index, x: index * (barWidth + barGap), y: height - size, size };
		})
	);
	/** Labels shown under the chart: the first, the last and a few between. */
	const ticks = $derived.by(() => {
		if (bars.length <= 12) return bars.map((_, index) => index);
		const step = Math.ceil(bars.length / 6);
		return bars
			.map((_, index) => index)
			.filter((index) => index % step === 0 || index === bars.length - 1);
	});
</script>

<div class="chart" class:accent>
	<div class="plot">
		<svg
			viewBox="0 0 {Math.max(1, bars.length * (barWidth + barGap) - barGap)} {height}"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			{#each shapes as shape (shape.index)}
				<rect
					class:active={active === shape.index}
					x={shape.x}
					y={shape.y}
					width={barWidth}
					height={shape.size}
					rx="1"
				/>
			{/each}
		</svg>
		<ul class="columns" aria-label={label}>
			{#each bars as bar, index (index)}
				<li>
					<button
						type="button"
						aria-label={bar.tip}
						onmouseenter={() => (active = index)}
						onmouseleave={() => (active = null)}
						onfocus={() => (active = index)}
						onblur={() => (active = null)}
					></button>
					{#if active === index}<span class="tip" aria-hidden="true">{bar.tip}</span>{/if}
				</li>
			{/each}
		</ul>
	</div>
	<ul class="ticks" aria-hidden="true">
		{#each bars as bar, index (index)}
			<li>{ticks.includes(index) ? bar.label : ''}</li>
		{/each}
	</ul>
</div>

<style>
	.plot {
		position: relative;
		height: var(--stats-chart-height);
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

	.accent rect {
		fill: var(--color-accent-dim);
	}

	rect.active {
		fill: var(--color-text-muted);
	}

	.accent rect.active {
		fill: var(--color-accent);
	}

	.columns,
	.ticks {
		display: grid;
		grid-auto-columns: 1fr;
		grid-auto-flow: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.columns {
		position: absolute;
		inset: 0;
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

	.ticks {
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--font-size-micro);
	}

	.ticks li {
		overflow: visible;
		white-space: nowrap;
	}
</style>
