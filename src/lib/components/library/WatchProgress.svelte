<script lang="ts">
	import type { ListProgress } from '#lib/catalog/lists.js';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		progress: ListProgress;
	}

	let { progress }: Props = $props();

	const percent = $derived(Math.round((progress.watched / progress.total) * 100));
</script>

<section class="progress">
	<div class="status">
		<h2>
			{m.list_progress()}
			<span class="amount">
				{m.list_progress_count({ watched: progress.watched, total: progress.total })}
			</span>
		</h2>
		<p class="percent">{percent}<span>%</span></p>
	</div>
	<svg class="track" viewBox="0 0 100 1" preserveAspectRatio="none" aria-hidden="true">
		<rect class="rail" width="100" height="1" />
		<rect class="done-bar" width={percent} height="1" />
	</svg>
</section>

<style>
	.progress {
		overflow: hidden;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-medium);
	}

	.status {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4);
	}

	.status h2 {
		display: flex;
		flex-direction: column;
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-body);
		font-weight: 400;
	}

	.amount {
		color: var(--color-text);
	}

	.percent {
		display: flex;
		align-items: flex-start;
		color: var(--color-text);
		font-size: var(--font-size-progress);
		font-weight: 300;
		line-height: 1;
	}

	.percent span {
		font-size: var(--font-size-large);
	}

	.track {
		display: block;
		width: 100%;
		height: var(--space-1);
	}

	.rail {
		fill: var(--color-panel);
	}

	.done-bar {
		fill: var(--color-progress);
	}
</style>
