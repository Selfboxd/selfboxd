<script lang="ts">
	import { workRoute } from '#lib/paths.js';
	import { resolve } from '$app/paths';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import RatingDisplay from '#lib/components/library/RatingDisplay.svelte';
	import { activitySentence } from '#lib/i18n/activity.js';
	import { formatDate } from '#lib/i18n/dates.js';
	import ProfileNav from '#lib/components/profile/ProfileNav.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const scale = $derived(data.user?.ratingScale ?? 'stars');
	const rows = $derived(data.events.map((event) => ({ event, ...activitySentence(event) })));
</script>

<svelte:head>
	<title>{m.nav_activity()} - Selfboxd</title>
</svelte:head>

<ProfileNav />

<h1 class="section-title">{m.nav_activity()}</h1>

{#if rows.length === 0}
	<p>{m.activity_empty()}</p>
{:else}
	<ul>
		{#each rows as { event, before, after }, index (index)}
			<li>
				<FilmPoster film={{ ...event.work, id: event.work.externalId }} size="tiny" />
				<p class="sentence">
					{before}<a href={resolve(workRoute(event.work.kind), { id: event.work.externalId })}>
						{event.work.title}
					</a>{after}
					{#if event.rating !== null}<RatingDisplay rating={event.rating} {scale} />{/if}
					{#if event.liked && event.kind !== 'liked'}
						<span class="liked"><Icon name="heart" filled label={m.action_liked()} /></span>
					{/if}
					{#if event.reviewed}<Icon name="review" label={m.diary_column_review()} />{/if}
				</p>
				<time datetime={event.at.toISOString()}>{formatDate(event.at)}</time>
			</li>
		{/each}
	</ul>
{/if}

<style>
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.sentence {
		flex: 1;
	}

	.sentence a {
		color: var(--color-heading);
		font-weight: 700;
	}

	.sentence a:hover {
		color: var(--color-link-hover);
	}

	.liked {
		color: var(--color-like);
	}

	time {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		white-space: nowrap;
	}
</style>
