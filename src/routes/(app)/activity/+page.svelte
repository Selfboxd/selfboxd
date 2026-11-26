<script lang="ts">
	import { workRoute } from '#lib/paths.js';
	import { resolve } from '$app/paths';
	import type { ActivityEvent } from '#lib/catalog/library.js';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import RatingDisplay from '#lib/components/library/RatingDisplay.svelte';
	import { activitySentence } from '#lib/i18n/activity.js';
	import ProfileNav from '#lib/components/profile/ProfileNav.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const scale = $derived(data.user?.ratingScale ?? 'stars');

	const dayFormat = $derived(
		new Intl.DateTimeFormat(getLocale(), {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		})
	);
	const timeFormat = $derived(
		new Intl.DateTimeFormat(getLocale(), { hour: '2-digit', minute: '2-digit' })
	);
	const relativeDay = $derived(new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' }));

	const dayLength = 24 * 60 * 60 * 1000;

	function dayKey(date: Date): string {
		return `${String(date.getFullYear())}-${String(date.getMonth())}-${String(date.getDate())}`;
	}

	/** Name of a day: today, yesterday, or its full date. */
	function dayName(date: Date): string {
		const now = Date.now();
		const key = dayKey(date);
		if (key === dayKey(new Date(now))) return capitalize(relativeDay.format(0, 'day'));
		if (key === dayKey(new Date(now - dayLength))) {
			return capitalize(relativeDay.format(-1, 'day'));
		}
		return capitalize(dayFormat.format(date));
	}

	function capitalize(text: string): string {
		return text.charAt(0).toLocaleUpperCase(getLocale()) + text.slice(1);
	}

	const icons: Record<ActivityEvent['kind'], IconName> = {
		logged: 'eye',
		watched: 'eye',
		liked: 'heart',
		watchlisted: 'clock'
	};

	const days = $derived.by(() => {
		const groups: { key: string; name: string; events: ActivityEvent[] }[] = [];
		for (const event of data.events) {
			const key = dayKey(event.at);
			const last = groups.at(-1);
			if (last?.key === key) last.events.push(event);
			else groups.push({ key, name: dayName(event.at), events: [event] });
		}
		return groups;
	});
</script>

<svelte:head>
	<title>{m.nav_activity()} - Selfboxd</title>
</svelte:head>

<ProfileNav />

<header class="head">
	<h1>{m.nav_activity()}</h1>
</header>

{#if days.length === 0}
	<p class="empty">{m.activity_empty()}</p>
{:else}
	{#each days as day (day.key)}
		<section aria-label={day.name}>
			<h2>{day.name}</h2>
			<ul>
				{#each day.events as event, index (index)}
					{@const sentence = activitySentence(event)}
					<li>
						<span
							class="icon {event.kind}"
							class:rewatch={event.kind === 'logged' && event.rewatch}
						>
							<Icon
								name={event.kind === 'logged' && event.rewatch ? 'rewatch' : icons[event.kind]}
								filled={event.kind === 'liked'}
							/>
						</span>
						<p class="sentence">
							{sentence.before}<a
								href={resolve(workRoute(event.work.kind), { id: event.work.externalId })}
							>
								{event.work.title}
							</a>{sentence.after}
							{#if event.work.year}<span class="year">{event.work.year}</span>{/if}
							{#if event.rating !== null}
								<span class="rating"><RatingDisplay rating={event.rating} {scale} /></span>
							{/if}
							{#if event.liked && event.kind !== 'liked'}
								<span class="liked"><Icon name="heart" filled label={m.action_liked()} /></span>
							{/if}
							{#if event.reviewed}
								<span class="reviewed"><Icon name="review" label={m.diary_column_review()} /></span>
							{/if}
						</p>
						<time datetime={event.at.toISOString()}>{timeFormat.format(event.at)}</time>
						<span class="poster">
							<FilmPoster film={{ ...event.work, id: event.work.externalId }} size="tiny" />
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
{/if}

<style>
	.head {
		margin-bottom: var(--space-4);
		padding-bottom: var(--space-1);
		border-bottom: 1px solid var(--color-border);
	}

	h1 {
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-large);
		font-weight: 400;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	section + section {
		margin-top: var(--space-6);
	}

	h2 {
		margin-bottom: var(--space-2);
		color: var(--color-text-muted);
		font-family: var(--font-body);
		font-size: var(--font-size-small);
		font-weight: 400;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: grid;
		grid-template-columns: var(--space-6) minmax(0, 1fr) auto auto;
		gap: var(--space-3);
		align-items: center;
		padding: var(--space-2) 0;
		border-top: 1px solid var(--color-border-subtle);
	}

	li:last-child {
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.icon {
		display: flex;
		justify-content: center;
		color: var(--color-text-muted);
		font-size: var(--font-size-large);
	}

	.icon.logged,
	.icon.watched {
		color: var(--color-accent);
	}

	.icon.liked {
		color: var(--color-like);
	}

	.icon.watchlisted,
	.icon.rewatch {
		color: var(--color-watchlist);
	}

	.sentence {
		color: var(--color-text);
	}

	.sentence a {
		color: var(--color-heading);
		font-weight: 700;
	}

	.sentence a:hover {
		color: var(--color-link-hover);
	}

	.year {
		margin-inline-start: var(--space-1);
		color: var(--color-text-muted);
	}

	.rating,
	.liked,
	.reviewed {
		margin-inline-start: var(--space-2);
	}

	.rating {
		color: var(--color-rating);
	}

	.liked {
		color: var(--color-like);
	}

	.reviewed {
		color: var(--color-text-muted);
	}

	time {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		white-space: nowrap;
	}

	.empty {
		color: var(--color-text);
	}
</style>
