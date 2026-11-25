<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import type { DiaryEntry, RatingScale } from '#lib/catalog/library.js';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import RatingDisplay from '#lib/components/library/RatingDisplay.svelte';
	import { formatDate } from '#lib/i18n/dates.js';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		entry: DiaryEntry;
		scale: RatingScale;
		/** Controls shown under the review. */
		actions?: Snippet;
	}

	let { entry, scale, actions }: Props = $props();

	let revealed = $state(false);

	const date = $derived(formatDate(new Date(entry.watchedOn)));
	const paragraphs = $derived(entry.review.split(/\n{2,}/).filter((text) => text.trim() !== ''));
</script>

<article>
	<FilmPoster film={{ ...entry.work, id: entry.work.externalId }} size="small" />
	<div class="body">
		<h3>
			<a href={resolve('/(app)/film/[id]', { id: entry.work.externalId })}>{entry.work.title}</a>
			{#if entry.work.year}<span class="year">{entry.work.year}</span>{/if}
		</h3>
		<p class="meta">
			{#if entry.rating !== null}<RatingDisplay rating={entry.rating} {scale} />{/if}
			{#if entry.liked}
				<span class="liked"><Icon name="heart" filled label={m.action_liked()} /></span>
			{/if}
			<span>
				{entry.rewatch ? m.activity_rewatched_on({ date }) : m.activity_watched_on({ date })}
			</span>
		</p>
		{#if entry.containsSpoilers && !revealed}
			<p class="spoiler">
				{m.review_spoiler_notice()}
				<button type="button" onclick={() => (revealed = true)}>{m.review_spoiler_reveal()}</button>
			</p>
		{:else}
			<div class="text">
				{#each paragraphs as paragraph, index (index)}
					<p>{paragraph}</p>
				{/each}
			</div>
		{/if}
		{#if actions}<div class="actions">{@render actions()}</div>{/if}
	</div>
</article>

<style>
	article {
		display: flex;
		gap: var(--space-4);
		padding: var(--space-4) 0;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.body {
		flex: 1;
		min-width: 0;
	}

	h3 {
		font-family: var(--font-display);
		font-size: var(--font-size-heading);
		font-weight: 900;
	}

	h3 a {
		color: var(--color-heading);
	}

	h3 a:hover {
		color: var(--color-link-hover);
	}

	.year {
		margin-inline-start: var(--space-1);
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-large);
		font-weight: 300;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--font-size-control);
	}

	.liked {
		color: var(--color-like);
	}

	.text {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-top: var(--space-3);
		font-family: var(--font-heading);
		font-size: var(--font-size-prose);
		line-height: 1.55;
	}

	.text p {
		overflow-wrap: anywhere;
		white-space: pre-line;
	}

	.spoiler {
		margin-top: var(--space-3);
	}

	.spoiler button {
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-text-strong);
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}

	.actions {
		margin-top: var(--space-3);
	}
</style>
