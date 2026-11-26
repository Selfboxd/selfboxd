<script lang="ts">
	interface Row {
		name: string;
		value: number;
		/** Text shown at the end of the row. */
		display: string;
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

<ol class="list" aria-label={label}>
	{#each rows as row, index (index)}
		<li>
			<span class="name">{row.name}</span>
			<svg viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true">
				<rect width="100" height="4" rx="2" class="track" />
				<rect width={Math.max(2, (row.value / highest) * 100)} height="4" rx="2" />
			</svg>
			<span class="value">{row.display}</span>
		</li>
	{/each}
</ol>

<style>
	.list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: grid;
		grid-template-columns: minmax(0, 7rem) minmax(0, 1fr) auto;
		gap: var(--space-3);
		align-items: center;
		font-size: var(--font-size-control);
	}

	.name {
		overflow: hidden;
		color: var(--color-text-strong);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	svg {
		display: block;
		width: 100%;
		height: var(--space-1);
	}

	rect {
		fill: var(--color-accent-dim);
	}

	.track {
		fill: var(--color-panel);
	}

	.value {
		min-width: 2.5rem;
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		text-align: end;
	}
</style>
