<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { FilmSummary } from '#lib/catalog/film.js';
	import type { ListProgress } from '#lib/catalog/lists.js';
	import Avatar from '#lib/components/Avatar.svelte';
	import Backdrop from '#lib/components/Backdrop.svelte';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import type { PublicUser } from '#lib/server/auth/users.js';
	import { m } from '#lib/paraglide/messages.js';

	interface Entry {
		film: Pick<FilmSummary, 'title' | 'year' | 'posterPath'> & { id: number | string };
		/** Position shown under the poster, or `null` for a list without order. */
		position: number | null;
		note: string;
	}

	interface Props {
		name: string;
		description?: string;
		/** Name of who made the list, or `null` when it is unknown. */
		owner: string | null;
		/** The local account that made the list, shown with its picture. */
		account?: PublicUser | undefined;
		/** Number of films in the whole list, when it is known. */
		count: number | null;
		/** Path of the TMDB backdrop shown as banner. */
		backdropPath: string | null;
		entries: Entry[];
		/** Text shown instead of the films when there is none. */
		empty: string;
		progress: ListProgress | null;
		/** Links shown in the panel beside the films. */
		actions?: Snippet;
		/** Content shown under the films. */
		children?: Snippet;
	}

	let {
		name,
		description = '',
		owner,
		account,
		count,
		backdropPath,
		entries,
		empty,
		progress,
		actions,
		children
	}: Props = $props();

	const percent = $derived(progress ? Math.round((progress.watched / progress.total) * 100) : 0);
</script>

{#if backdropPath}<Backdrop path={backdropPath} />{/if}

<div class="list" class:with-backdrop={backdropPath} class:wide={!actions && !progress}>
	<div class="content">
		<header>
			{#if owner !== null}
				<p class="owner">
					{#if account}<Avatar user={account} />{/if}
					<span>{m.list_by()}</span>
					<strong>{owner}</strong>
				</p>
			{/if}
			{#if count !== null}<p class="count">{m.list_count({ count })}</p>{/if}
		</header>

		<h1>{name}</h1>
		{#if description}<p class="description">{description}</p>{/if}

		{#if entries.length === 0}
			<p class="empty">{empty}</p>
		{:else}
			<ul class="grid">
				{#each entries as { film, position, note } (film.id)}
					<li>
						<FilmPoster {film} size="medium" />
						{#if position !== null}<p class="position">{position}</p>{/if}
						{#if note}<p class="note">{note}</p>{/if}
					</li>
				{/each}
			</ul>
		{/if}

		{@render children?.()}
	</div>

	{#if actions || progress}
		<aside>
			{#if actions}<div class="panel">{@render actions()}</div>{/if}
			{#if progress}
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
						<rect class="done" width={percent} height="1" />
					</svg>
				</section>
			{/if}
		</aside>
	{/if}
</div>

<style>
	.list {
		display: grid;
		grid-template-columns: minmax(0, 1fr) var(--sidebar-width);
		gap: var(--space-8);
		align-items: start;
	}

	.with-backdrop {
		margin-top: var(--list-offset);
	}

	.wide {
		grid-template-columns: minmax(0, 1fr);
	}

	header {
		display: flex;
		min-height: var(--space-8);
		gap: var(--space-3);
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-4);
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--color-border);
		font-size: var(--font-size-control);
	}

	.owner {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}

	.owner strong {
		color: var(--color-text-strong);
	}

	.count {
		margin-inline-start: auto;
		color: var(--color-text-muted);
	}

	h1 {
		font-family: var(--font-display);
		font-size: var(--font-size-title);
		font-weight: 900;
		line-height: 1.15;
		letter-spacing: -0.01em;
		overflow-wrap: anywhere;
	}

	.description {
		max-width: 38rem;
		margin-top: var(--space-3);
		font-family: var(--font-heading);
		font-size: var(--font-size-prose);
		white-space: pre-line;
		overflow-wrap: anywhere;
	}

	.empty {
		margin-top: var(--space-6);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, var(--poster-list));
		gap: var(--space-4) var(--space-2);
		justify-content: space-between;
		margin: var(--space-6) 0 0;
		padding: 0;
		list-style: none;
	}

	.grid :global(.poster) {
		width: 100%;
	}

	.position {
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--font-size-control);
		text-align: center;
	}

	.note {
		margin-top: var(--space-1);
		font-size: var(--font-size-small);
		overflow-wrap: anywhere;
	}

	aside {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.panel {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-radius: var(--radius-medium);
		background: var(--color-surface-raised);
	}

	.panel :global(a) {
		padding: var(--space-3);
		color: var(--color-text-panel);
		font-size: var(--font-size-body);
		text-align: center;
	}

	.panel :global(a + a) {
		border-top: 1px solid var(--color-dialog-divider);
	}

	.panel :global(a:hover) {
		color: var(--color-heading);
	}

	.status {
		display: flex;
		gap: var(--space-3);
		align-items: flex-end;
		justify-content: space-between;
	}

	h2 {
		display: flex;
		flex-direction: column;
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-small);
		font-weight: 400;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.amount {
		color: var(--color-text-strong);
		font-size: var(--font-size-body);
		letter-spacing: 0;
		text-transform: none;
	}

	.percent {
		color: var(--color-highlight);
		font-size: var(--font-size-title);
		font-weight: 300;
		line-height: 1;
	}

	.percent span {
		font-size: var(--font-size-body);
	}

	.track {
		display: block;
		width: 100%;
		height: var(--space-1);
		margin-top: var(--space-2);
		border-radius: var(--radius-pill);
	}

	.rail {
		fill: var(--color-panel);
	}

	.done {
		fill: var(--color-highlight);
	}

	@media (max-width: 48rem) {
		.list {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
