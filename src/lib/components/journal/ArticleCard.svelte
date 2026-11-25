<script lang="ts">
	import type { Article } from '#lib/catalog/journal.js';
	import { formatDate } from '#lib/i18n/dates.js';

	interface Props {
		article: Article;
		/** `feature` is the large centred lead, `card` has a picture, `line` is text only. */
		variant?: 'feature' | 'card' | 'line';
		/** Whether the section of the article is shown above its headline. */
		rubric?: boolean;
	}

	let { article, variant = 'card', rubric = true }: Props = $props();

	const headline = $derived(
		/[.!?]$/.test(article.headline) ? article.headline : `${article.headline}.`
	);
	const subtitle = $derived(article.subtitle.charAt(0).toUpperCase() + article.subtitle.slice(1));
</script>

<article class={variant}>
	<a href={article.url} target="_blank" rel="external noopener noreferrer">
		{#if article.imageUrl && variant !== 'line'}
			<img
				src={article.imageUrl}
				alt=""
				width="960"
				height="540"
				loading={variant === 'feature' ? 'eager' : 'lazy'}
			/>
		{/if}
		{#if variant !== 'line'}
			<p class="meta">
				{#if rubric && article.category}<span class="rubric">{article.category}</span>{/if}
				{#if variant === 'card'}
					<time datetime={article.publishedAt}>{formatDate(new Date(article.publishedAt))}</time>
				{/if}
			</p>
		{/if}
		{#if variant === 'feature'}
			<h2>{headline}</h2>
		{:else}
			<h3>{headline}</h3>
		{/if}
		<p class="teaser">
			{#if variant === 'line' && subtitle}
				{subtitle}
			{:else}
				{#each article.teaser as segment, index (index)}
					{#if segment.emphasis}<em>{segment.text}</em>{:else}{segment.text}{/if}
				{/each}
			{/if}
		</p>
		{#if variant === 'feature'}
			<time datetime={article.publishedAt}>{formatDate(new Date(article.publishedAt))}</time>
		{/if}
	</a>
</article>

<style>
	a {
		display: block;
		color: inherit;
	}

	img {
		width: 100%;
		height: auto;
		margin-bottom: var(--space-3);
		aspect-ratio: 16 / 9;
		background: var(--color-ink-rule);
		object-fit: cover;
	}

	.meta {
		display: flex;
		gap: var(--space-3);
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: var(--space-2);
		color: var(--color-ink-soft);
		font-size: var(--font-size-small);
	}

	.rubric {
		color: var(--color-ink);
		font-family: var(--font-heading);
		font-size: var(--font-size-body);
		font-weight: 700;
	}

	h2,
	h3 {
		color: var(--color-ink);
		font-family: var(--font-body);
		font-weight: 900;
		letter-spacing: -0.02em;
	}

	h3 {
		font-size: var(--font-size-journal-title);
	}

	a:hover h2,
	a:hover h3 {
		text-decoration: underline;
		text-decoration-thickness: 2px;
		text-underline-offset: 0.15em;
	}

	.teaser {
		margin-top: var(--space-2);
		color: var(--color-ink-soft);
		font-family: var(--font-heading);
		font-size: var(--font-size-body);
		line-height: 1.55;
	}

	.feature a {
		display: grid;
		grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
		gap: var(--space-2) var(--space-12);
		align-content: center;
		align-items: center;
		text-align: center;
	}

	.feature img {
		grid-row: 1 / span 4;
		margin: 0;
	}

	.feature .meta {
		align-self: end;
		justify-content: center;
		margin: 0;
	}

	.feature .rubric,
	.feature h2 {
		color: var(--color-heading);
	}

	.feature .rubric {
		color: var(--color-field-light);
		font-size: var(--font-size-large);
	}

	.feature h2 {
		font-size: var(--font-size-title);
	}

	.feature .teaser {
		align-self: start;
		margin: 0;
		color: var(--color-text-strong);
		font-size: var(--font-size-heading);
		line-height: 1.35;
	}

	.feature time {
		align-self: start;
		color: var(--color-field-light);
		font-size: var(--font-size-small);
		font-weight: 700;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}

	.line {
		padding: var(--space-3) 0;
		border-top: 1px solid var(--color-ink-rule);
	}

	.line h3 {
		font-size: var(--font-size-large);
	}

	.line .teaser {
		margin-top: var(--space-1);
	}

	@media (max-width: 56rem) {
		.feature a {
			grid-template-columns: minmax(0, 1fr);
		}

		.feature img {
			grid-row: auto;
		}
	}
</style>
