<script lang="ts">
	interface Row {
		name: string;
		value: number;
		/** Text shown at the end of the row. */
		display: string;
		/** Page the row opens, when there is one. */
		href?: string | null;
	}

	interface Props {
		rows: Row[];
		label: string;
		/** Value of a full bar, the highest row when left out. */
		scale?: number | undefined;
	}

	let { rows, label, scale }: Props = $props();

	const highest = $derived(scale ?? Math.max(1, ...rows.map((row) => row.value)));
</script>

{#snippet line(row: Row)}
	<span class="name">{row.name}</span>
	<span class="value">{row.display}</span>
	<svg viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true">
		<rect width="100" height="4" rx="2" class="track" />
		<rect width={Math.max(2, (row.value / highest) * 100)} height="4" rx="2" class="fill" />
	</svg>
{/snippet}

<ol class="list" aria-label={label}>
	{#each rows as row, index (index)}
		<li>
			{#if row.href}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- built by the page from resolved routes -->
				<a class="row" href={row.href}>{@render line(row)}</a>
			{:else}
				<span class="row">{@render line(row)}</span>
			{/if}
		</li>
	{/each}
</ol>

<style>
	.list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--space-1) var(--space-3);
		align-items: baseline;
		color: var(--color-text-panel);
		font-size: var(--font-size-control);
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.value {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		font-variant-numeric: tabular-nums;
	}

	svg {
		display: block;
		grid-column: 1 / -1;
		width: 100%;
		height: 4px;
	}

	.track {
		fill: var(--color-stat-track);
	}

	.fill {
		fill: var(--color-stat-bar);
		transition: fill var(--duration-fast);
	}

	a.row:hover {
		color: var(--color-heading);
	}

	a.row:hover .fill {
		fill: var(--color-stat-bar-hover);
	}
</style>
