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
		/** Opens the dialog that chooses the lists holding the film. */
		onlists: () => void;
	}

	let { state, scale, onlog, onedit, onwatchlist, onlists }: Props = $props();

	const logged = $derived(state.logCount > 0);
	const watchLabel = $derived(
		logged ? m.action_logged() : state.watched ? m.action_watched() : m.action_watch()
	);
</script>

{#snippet watchlistIcon(listed: boolean)}
	<svg class="glyph" viewBox="0 0 40 34" aria-hidden="true">
		<circle class="shape" cx="17" cy="16" r="13.5" />
		<path class="hands" d="M22.5 10.500L17 16h-6.500" />
		<circle class="badge" cx="30.5" cy="25.500" r="7" />
		<path class="sign" d={listed ? 'M27 25.500h7' : 'M27 25.500h7M30.500 22v7'} />
	</svg>
{/snippet}

<section class="actions" aria-label={m.actions_label()}>
	<div class="toggles">
		<form method="POST" action="?/watch" use:enhance>
			<input type="hidden" name="watched" value={String(!state.watched)} />
			<button class="toggle watch" class:on={state.watched} aria-pressed={state.watched}>
				<span class="eye">
					<svg class="glyph" viewBox="0 0 52 32" aria-hidden="true">
						<path
							class="shape"
							d="M2 16C9 5.500 18 2.500 26 2.500S43 5.500 50 16C43 26.500 34 29.500 26 29.500S9 26.500 2 16Z"
						/>
						<circle class="pupil" cx="26" cy="16" r="6.5" />
					</svg>
					{#if state.logCount > 1}<span class="count">{state.logCount}</span>{/if}
				</span>
				<span>{watchLabel}</span>
			</button>
		</form>
		<form method="POST" action="?/like" use:enhance>
			<input type="hidden" name="liked" value={String(!state.liked)} />
			<button class="toggle like" class:on={state.liked} aria-pressed={state.liked}>
				<svg class="glyph" viewBox="0 0 40 32" aria-hidden="true">
					<path
						class="shape"
						d="M20 30S3 20 3 10.500C3 5.500 7 2.500 11 2.500C15 2.500 18.500 5 20 8.500C21.500 5 25 2.500 29 2.500C33 2.500 37 5.500 37 10.500C37 20 20 30 20 30Z"
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
	<button class="row" type="button" onclick={onlists}>{m.action_add_to_lists()}</button>
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
		display: block;
		height: var(--action-icon-height);
		fill: none;
		stroke: var(--color-action-idle);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.75;
		transition:
			stroke var(--duration-fast),
			fill var(--duration-fast),
			transform var(--duration-fast);
	}

	.toggle:hover .glyph {
		stroke: var(--color-heading);
		transform: scale(1.08);
	}

	.eye {
		position: relative;
		display: block;
	}

	.count {
		position: absolute;
		right: -0.25rem;
		bottom: -0.25rem;
		min-width: 1.125rem;
		border: 2px solid var(--color-surface-raised);
		border-radius: var(--radius-pill);
		background: var(--color-action-idle);
		color: var(--color-surface-raised);
		font-size: var(--font-size-micro);
		font-weight: 700;
		line-height: 1.4;
	}

	.watch.on .shape {
		fill: var(--color-highlight);
		stroke: var(--color-highlight);
	}

	.watch.on .pupil,
	.toggle.watch.on:hover .pupil {
		stroke: var(--color-surface-raised);
		stroke-width: 3.5;
	}

	.like.on .shape {
		fill: var(--color-like);
		stroke: var(--color-like);
	}

	.watchlist .badge {
		fill: var(--color-action-idle);
		stroke: var(--color-surface-raised);
		stroke-width: 2;
	}

	.watchlist:hover .badge {
		fill: var(--color-heading);
	}

	.watchlist .sign,
	.toggle.watchlist:hover .sign {
		stroke: var(--color-surface-raised);
		stroke-width: 2;
	}

	.watchlist.on .shape {
		fill: var(--color-watchlist);
		stroke: var(--color-watchlist);
	}

	.watchlist.on .hands,
	.toggle.watchlist.on:hover .hands {
		stroke: var(--color-surface-raised);
		stroke-width: 2.25;
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
