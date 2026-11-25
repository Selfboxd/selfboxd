<script lang="ts">
	import { enhance } from '$app/forms';
	import RatingInput from '#lib/components/library/RatingInput.svelte';
	import type { RatingScale, WorkState } from '#lib/catalog/library.js';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		/** What the signed-in account did with the film. */
		state: WorkState;
		scale: RatingScale;
		/** Opens the log dialog for a new viewing. */
		onlog: () => void;
		/** Opens the log dialog on the latest diary entry. */
		onedit: () => void;
		/** Opens the watchlist dialog. */
		onwatchlist: () => void;
	}

	let { state, scale, onlog, onedit, onwatchlist }: Props = $props();

	const logged = $derived(state.logCount > 0);
	const watchLabel = $derived(
		logged ? m.action_logged() : state.watched ? m.action_watched() : m.action_watch()
	);
</script>

{#snippet watchlistIcon(listed: boolean)}
	<svg class="glyph" viewBox="0 0 44 36" aria-hidden="true">
		<circle class="shape" cx="19" cy="17" r="14" />
		<path class="hands" d="M19 8.500V17l-6.500 3.500" />
		<circle class="badge" cx="33" cy="27" r="7.500" />
		<path class="sign" d={listed ? 'M29.500 27h7' : 'M29.500 27h7M33 23.500v7'} />
	</svg>
{/snippet}

<section class="actions" aria-label={m.actions_label()}>
	<div class="toggles">
		<form method="POST" action="?/watch" use:enhance>
			<input type="hidden" name="watched" value={String(!state.watched)} />
			<button class="toggle watch" class:on={state.watched} aria-pressed={state.watched}>
				<svg class="glyph" viewBox="0 0 48 36" aria-hidden="true">
					{#if state.watched}
						<path
							class="shape"
							d="M2 18C10 5 38 5 46 18C38 31 10 31 2 18ZM16 18a8 8 0 1 0 16 0a8 8 0 1 0-16 0ZM20 18a4 4 0 1 0 8 0a4 4 0 1 0-8 0Z"
						/>
					{:else}
						<path class="shape" d="M2 18C10 5 38 5 46 18C38 31 10 31 2 18Z" />
						<circle class="shape" cx="24" cy="18" r="6" />
					{/if}
				</svg>
				<span>{watchLabel}</span>
			</button>
		</form>
		<form method="POST" action="?/like" use:enhance>
			<input type="hidden" name="liked" value={String(!state.liked)} />
			<button class="toggle like" class:on={state.liked} aria-pressed={state.liked}>
				<svg class="glyph" viewBox="0 0 40 36" aria-hidden="true">
					<path
						class="shape"
						d="M20 33C7 23 2 17 2 11.500C2 6 6 3 10.500 3C14.500 3 18 5.500 20 9C22 5.500 25.500 3 29.500 3C34 3 38 6 38 11.500C38 17 33 23 20 33Z"
					/>
				</svg>
				<span>{state.liked ? m.action_liked() : m.action_like()}</span>
			</button>
		</form>
		{#if state.inWatchlist}
			<form method="POST" action="?/watchlist" use:enhance>
				<input type="hidden" name="listed" value="false" />
				<button class="toggle watchlist on" aria-pressed="true">
					{@render watchlistIcon(true)}
					<span>{m.action_watchlist()}</span>
				</button>
			</form>
		{:else}
			<button class="toggle watchlist" type="button" aria-pressed="false" onclick={onwatchlist}>
				{@render watchlistIcon(false)}
				<span>{m.action_watchlist()}</span>
			</button>
		{/if}
	</div>

	<form class="rate" method="POST" action="?/rate" use:enhance>
		<span class="rate-label">{state.rating === null ? m.action_rate() : m.action_rated()}</span>
		<RatingInput value={state.rating} {scale} mode="submit" />
	</form>

	{#if logged}
		<a class="row" href="#activity">{m.action_show_activity()}</a>
		<button class="row" type="button" onclick={onedit}>{m.action_edit_entry()}</button>
		<button class="row" type="button" onclick={onlog}>{m.action_log_again()}</button>
	{:else}
		<button class="row" type="button" onclick={onlog}>{m.action_log()}</button>
	{/if}
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
	}

	.toggles {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		padding: var(--space-3) var(--space-2) var(--space-2);
	}

	.toggle {
		display: flex;
		width: 100%;
		flex-direction: column;
		gap: var(--space-1);
		align-items: center;
		padding: var(--space-1) 0;
		border: 0;
		background: none;
		color: var(--color-text-panel);
		font-family: inherit;
		font-size: var(--font-size-control);
		cursor: pointer;
	}

	.toggle:hover {
		color: var(--color-heading);
	}

	.glyph {
		height: var(--action-icon-height);
		fill: none;
		stroke: var(--color-action-idle);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2;
	}

	.toggle:hover .glyph {
		stroke: var(--color-heading);
	}

	.watch.on .shape {
		fill: var(--color-highlight);
		fill-rule: evenodd;
		stroke: none;
	}

	.like.on .shape {
		fill: var(--color-like);
		stroke: none;
	}

	.watchlist .badge {
		fill: var(--color-action-idle);
		stroke: var(--color-surface-raised);
	}

	.watchlist .sign {
		stroke: var(--color-surface-raised);
		stroke-width: 2.5;
	}

	.watchlist.on .shape {
		fill: var(--color-watchlist);
		stroke: none;
	}

	.watchlist.on .hands {
		stroke: var(--color-surface-raised);
		stroke-width: 2.5;
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
		border-top: 1px solid var(--color-dialog-divider);
		background: none;
		color: var(--color-text-panel);
		font-family: inherit;
		font-size: var(--font-size-body);
	}

	.rate {
		padding-bottom: var(--space-2);
		font-size: var(--font-size-control);
	}

	.rate :global(.input) {
		--rating-size: var(--font-size-rating-card);
	}

	.rate :global(.input.stars button.on) {
		color: var(--color-highlight);
	}

	.row {
		cursor: pointer;
	}

	.row:hover {
		color: var(--color-heading);
	}
</style>
