<script lang="ts">
	import { resolve } from '$app/paths';
	import Avatar from '#lib/components/Avatar.svelte';
	import Backdrop from '#lib/components/Backdrop.svelte';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import LogDialog from '#lib/components/library/LogDialog.svelte';
	import RatingDisplay from '#lib/components/library/RatingDisplay.svelte';
	import type { LogTarget } from '#lib/components/library/log-target.js';
	import { imageKey } from '#lib/catalog/images.js';
	import { formatDate } from '#lib/i18n/dates.js';
	import { seasonName } from '#lib/i18n/series.js';
	import { m } from '#lib/paraglide/messages.js';
	import { workRoute } from '#lib/paths.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let revealed = $state(false);
	let logTarget = $state<LogTarget | null>(null);

	const entry = $derived(data.entry);
	const scale = $derived(data.user?.ratingScale ?? 'stars');
	const work = $derived({ ...entry.work, id: entry.work.externalId });
	const workPath = $derived(resolve(workRoute(entry.work.kind), { id: entry.work.externalId }));
	const backdropPath = $derived(
		data.images[imageKey(entry.work.kind, entry.work.externalId)]?.backdrop ?? data.backdropPath
	);
	const date = $derived(formatDate(new Date(entry.watchedOn)));
	const paragraphs = $derived(entry.review.split(/\n{2,}/).filter((text) => text.trim() !== ''));

	function edit() {
		logTarget = {
			kind: 'edit',
			entry,
			seasons: data.seasons.map((number) => ({ number, name: seasonName(number) }))
		};
	}
</script>

<svelte:head>
	<title>{m.review_page_title({ title: entry.work.title })} - Selfboxd</title>
</svelte:head>

{#if backdropPath}
	<Backdrop path={backdropPath} />
{/if}

<div class="review" class:with-backdrop={backdropPath}>
	<aside class="poster">
		<FilmPoster film={work} size="large" />
	</aside>

	<article>
		<p class="by">
			{#if data.user}<Avatar user={data.user} />{/if}
			<span>{m.review_by({ name: data.user?.username ?? '' })}</span>
		</p>
		<h1>
			<a href={workPath}>{entry.work.title}</a>
			{#if entry.work.year}<span class="year">{entry.work.year}</span>{/if}
		</h1>
		<p class="meta">
			{#if entry.rating !== null}<RatingDisplay rating={entry.rating} {scale} />{/if}
			{#if entry.liked}
				<span class="liked"><Icon name="heart" filled label={m.action_liked()} /></span>
			{/if}
			{#if entry.rewatch}
				<span class="rewatch"><Icon name="rewatch" label={m.diary_column_rewatch()} /></span>
			{/if}
		</p>
		<p class="watched">
			{#if entry.season !== null}<span class="season">{seasonName(entry.season)}</span>{/if}
			{entry.rewatch ? m.activity_rewatched_on({ date }) : m.activity_watched_on({ date })}
		</p>

		{#if entry.review === ''}
			<p class="empty">{m.review_page_empty()}</p>
		{:else if entry.containsSpoilers && !revealed}
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

		{#if entry.tags.length > 0}
			<ul class="tags" aria-label={m.log_tags()}>
				{#each entry.tags as tag (tag)}
					<li>{tag}</li>
				{/each}
			</ul>
		{/if}
	</article>

	<aside class="panel">
		<button type="button" onclick={edit}>{m.review_page_edit()}</button>
		<a href={workPath}>{m.review_page_work({ title: entry.work.title })}</a>
		<a href={resolve('/(app)/reviews')}>{m.review_page_all()}</a>
	</aside>
</div>

<LogDialog bind:target={logTarget} {scale} />

<style>
	.review {
		display: grid;
		grid-template-columns: var(--poster-large) minmax(0, 1fr) var(--review-panel-width);
		gap: var(--space-8);
		align-items: start;
		padding-top: var(--space-6);
	}

	.with-backdrop {
		margin-top: var(--backdrop-offset);
	}

	.by {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		color: var(--color-text-muted);
		font-size: var(--font-size-control);
	}

	h1 {
		margin-top: var(--space-3);
		font-family: var(--font-display);
		font-size: var(--font-size-title);
		font-weight: 900;
		line-height: 1.1;
	}

	h1 a {
		color: var(--color-heading);
	}

	h1 a:hover {
		color: var(--color-link-hover);
	}

	.year {
		margin-inline-start: var(--space-2);
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-heading);
		font-weight: 300;
	}

	.meta {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		margin-top: var(--space-3);
		font-size: var(--font-size-large);
	}

	.liked {
		display: flex;
		color: var(--color-like);
	}

	.rewatch {
		display: flex;
		color: var(--color-text-muted);
	}

	.watched {
		margin-top: var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--font-size-control);
	}

	.season {
		margin-inline-end: var(--space-2);
		color: var(--color-text-strong);
	}

	.text {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin-top: var(--space-6);
		color: var(--color-text-strong);
		font-family: var(--font-heading);
		font-size: var(--font-size-prose);
		line-height: 1.6;
	}

	.text p {
		overflow-wrap: anywhere;
		white-space: pre-line;
	}

	.empty,
	.spoiler {
		margin-top: var(--space-6);
		color: var(--color-text-muted);
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

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin: var(--space-6) 0 0;
		padding: 0;
		list-style: none;
	}

	.tags li {
		padding: 0 var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-panel);
		color: var(--color-text);
		font-size: var(--font-size-control);
		line-height: 1.8;
	}

	.panel {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-radius: var(--radius-small);
		background: var(--color-panel);
	}

	.panel button,
	.panel a {
		padding: var(--space-3) var(--space-4);
		border: 0;
		border-bottom: 1px solid var(--color-background);
		background: none;
		color: var(--color-text-panel);
		font: inherit;
		font-size: var(--font-size-control);
		text-align: center;
		cursor: pointer;
	}

	.panel :last-child {
		border-bottom: 0;
	}

	.panel button:hover,
	.panel a:hover {
		color: var(--color-heading);
	}

	@media (max-width: 60rem) {
		.review {
			grid-template-columns: var(--poster-medium) minmax(0, 1fr);
		}

		.panel {
			grid-column: 1 / -1;
		}
	}

	@media (max-width: 40rem) {
		.review {
			grid-template-columns: minmax(0, 1fr);
		}

		.poster {
			display: none;
		}
	}
</style>
