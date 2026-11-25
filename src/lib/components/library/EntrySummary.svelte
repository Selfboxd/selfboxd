<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import type { DiaryEntry, RatingScale } from '#lib/catalog/library.js';
	import { formatDate } from '#lib/i18n/dates.js';
	import { m } from '#lib/paraglide/messages.js';
	import RatingDisplay from './RatingDisplay.svelte';

	interface Props {
		entry: DiaryEntry;
		scale: RatingScale;
		/** Opens the entry for editing. */
		onedit: (entry: DiaryEntry) => void;
	}

	let { entry, scale, onedit }: Props = $props();

	let revealed = $state(false);

	const date = $derived(formatDate(new Date(entry.watchedOn)));
	const paragraphs = $derived(entry.review.split(/\n{2,}/).filter((text) => text.trim() !== ''));
</script>

<article>
	<p class="meta">
		{#if entry.rating !== null}<RatingDisplay rating={entry.rating} {scale} />{/if}
		{#if entry.liked}<span class="liked">
				<Icon name="heart" filled label={m.action_liked()} />
			</span>{/if}
		<span>
			{entry.rewatch ? m.activity_rewatched_on({ date }) : m.activity_watched_on({ date })}
		</span>
		<button
			class="edit"
			type="button"
			onclick={() => {
				onedit(entry);
			}}
		>
			<Icon name="pencil" label={m.diary_edit()} />
		</button>
	</p>

	{#if paragraphs.length > 0}
		{#if entry.containsSpoilers && !revealed}
			<p class="spoiler">
				{m.review_spoiler_notice()}
				<button type="button" onclick={() => (revealed = true)}>{m.review_spoiler_reveal()}</button>
			</p>
		{:else}
			<div class="review">
				{#each paragraphs as paragraph, index (index)}
					<p>{paragraph}</p>
				{/each}
			</div>
		{/if}
	{/if}

	{#if entry.tags.length > 0}
		<ul class="tags">
			{#each entry.tags as tag (tag)}<li>{tag}</li>{/each}
		</ul>
	{/if}
</article>

<style>
	article {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4) 0;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
	}

	.liked {
		color: var(--color-like);
	}

	.edit,
	.spoiler button {
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-text);
		font: inherit;
		cursor: pointer;
	}

	.edit {
		margin-inline-start: auto;
	}

	.edit:hover,
	.spoiler button:hover {
		color: var(--color-link-hover);
	}

	.spoiler button {
		color: var(--color-text-strong);
		text-decoration: underline;
	}

	.review {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		font-family: var(--font-heading);
		font-size: var(--font-size-prose);
		line-height: 1.55;
	}

	.review p {
		overflow-wrap: anywhere;
		white-space: pre-line;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.tags li {
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-chip);
		font-size: var(--font-size-small);
	}
</style>
