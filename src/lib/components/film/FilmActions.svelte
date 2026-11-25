<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/Icon.svelte';
	import RatingInput from '#lib/components/library/RatingInput.svelte';
	import type { RatingScale, WorkState } from '#lib/catalog/library.js';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		/** What the signed-in account did with the film. */
		state: WorkState;
		scale: RatingScale;
		/** Opens the log dialog. */
		onlog: () => void;
		/** Opens the watchlist dialog. */
		onwatchlist: () => void;
	}

	let { state, scale, onlog, onwatchlist }: Props = $props();

	const watchLabel = $derived(
		state.logCount > 0 ? m.action_logged() : state.watched ? m.action_watched() : m.action_watch()
	);
</script>

<section class="actions" aria-label={m.actions_label()}>
	<div class="toggles">
		<form method="POST" action="?/watch" use:enhance>
			<input type="hidden" name="watched" value={String(!state.watched)} />
			<button class="toggle watch" class:on={state.watched} aria-pressed={state.watched}>
				<Icon name="eye" filled={state.watched} />
				<span>{watchLabel}</span>
			</button>
		</form>
		<form method="POST" action="?/like" use:enhance>
			<input type="hidden" name="liked" value={String(!state.liked)} />
			<button class="toggle like" class:on={state.liked} aria-pressed={state.liked}>
				<Icon name="heart" filled={state.liked} />
				<span>{state.liked ? m.action_liked() : m.action_like()}</span>
			</button>
		</form>
		{#if state.inWatchlist}
			<form method="POST" action="?/watchlist" use:enhance>
				<input type="hidden" name="listed" value="false" />
				<button class="toggle watchlist on" aria-pressed="true">
					<Icon name="clock" />
					<span>{m.action_watchlist()}</span>
				</button>
			</form>
		{:else}
			<button class="toggle watchlist" type="button" aria-pressed="false" onclick={onwatchlist}>
				<Icon name="clock" />
				<span>{m.action_watchlist()}</span>
			</button>
		{/if}
	</div>

	<form class="rate" method="POST" action="?/rate" use:enhance>
		<span class="rate-label">{state.rating === null ? m.action_rate() : m.action_rated()}</span>
		<RatingInput value={state.rating} {scale} mode="submit" />
	</form>

	<button class="row" type="button" onclick={onlog}>
		{state.watched ? m.action_log_again() : m.action_log()}
	</button>
	{#if state.inWatchlist}
		<button class="row" type="button" onclick={onwatchlist}>{m.action_watchlist_edit()}</button>
	{/if}
</section>

<style>
	.actions {
		overflow: hidden;
		border-radius: var(--radius-medium);
		background: var(--color-surface-raised);
		color: var(--color-text-panel);
		font-size: var(--font-size-control);
	}

	.toggles {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		padding: var(--space-3) var(--space-2);
	}

	.toggle {
		display: flex;
		width: 100%;
		flex-direction: column;
		gap: var(--space-1);
		align-items: center;
		padding: var(--space-1);
		border: 0;
		background: none;
		color: var(--color-text-panel);
		font-family: inherit;
		font-size: var(--font-size-control);
		cursor: pointer;
	}

	.toggle :global(svg) {
		color: var(--color-action-idle);
		font-size: var(--font-size-action-icon);
	}

	.toggle:hover {
		color: var(--color-heading);
	}

	.watch.on :global(svg) {
		color: var(--color-highlight);
	}

	.like.on :global(svg) {
		color: var(--color-like);
	}

	.watchlist.on :global(svg) {
		color: var(--color-link-hover);
	}

	.rate,
	.row {
		display: flex;
		width: 100%;
		flex-direction: column;
		gap: var(--space-1);
		align-items: center;
		padding: var(--space-3);
		border: 0;
		border-top: 1px solid var(--color-background);
		background: none;
		color: var(--color-text-panel);
		font-family: inherit;
		font-size: var(--font-size-control);
	}

	.row {
		cursor: pointer;
	}

	.row:hover {
		color: var(--color-heading);
	}
</style>
