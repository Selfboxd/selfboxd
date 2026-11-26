<script lang="ts">
	import { workRoute } from '#lib/paths.js';
	import { resolve } from '$app/paths';
	import Avatar from '#lib/components/Avatar.svelte';
	import Backdrop from '#lib/components/Backdrop.svelte';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import ListStack from '#lib/components/library/ListStack.svelte';
	import RatingDisplay from '#lib/components/library/RatingDisplay.svelte';
	import ProfileLinks from '#lib/components/profile/ProfileLinks.svelte';
	import ProfileNav from '#lib/components/profile/ProfileNav.svelte';
	import { isLongBio } from '#lib/catalog/library.js';
	import RatingHistogram from '#lib/components/profile/RatingHistogram.svelte';
	import ReviewCard from '#lib/components/profile/ReviewCard.svelte';
	import { activitySentence } from '#lib/i18n/activity.js';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const scale = $derived(data.user?.ratingScale ?? 'stars');
	const longBio = $derived(isLongBio(data.profile.bio));
	const ratedCount = $derived(data.histogram.reduce((sum, count) => sum + count, 0));
	const stats = $derived([
		{ value: data.stats.watched, label: m.profile_stat_films() },
		{ value: data.stats.thisYear, label: m.profile_stat_this_year() },
		{ value: data.stats.lists, label: m.nav_lists() }
	]);

	const monthFormat = $derived(
		new Intl.DateTimeFormat(getLocale(), { month: 'short', timeZone: 'UTC' })
	);
	const diary = $derived(
		data.diary.map((entry, index) => {
			const month = entry.watchedOn.slice(0, 7);
			return {
				entry,
				month:
					data.diary[index - 1]?.watchedOn.slice(0, 7) === month
						? null
						: monthFormat.format(new Date(`${month}-01`)),
				day: Number(entry.watchedOn.slice(8, 10))
			};
		})
	);
	const activity = $derived(data.activity.map((event) => ({ event, ...activitySentence(event) })));
</script>

<svelte:head>
	<title>{data.user?.username} - Selfboxd</title>
</svelte:head>

{#if data.profile.bannerPath}
	<Backdrop path={data.profile.bannerPath} />
{/if}

{#if data.user}
	<header class="head" class:with-banner={data.profile.bannerPath}>
		<Avatar user={data.user} size="large" />
		<div class="identity">
			<p class="name">
				<span class="username">{data.user.username}</span>
				<a class="edit" href={resolve('/(app)/settings/profile')}>{m.profile_edit()}</a>
			</p>
			<h1 class="sr-only">{data.user.username}</h1>
			{#if data.profile.bio && !longBio}<p class="bio">{data.profile.bio}</p>{/if}
			{#if data.profile.location}
				<p class="location"><Icon name="pin" filled /> {data.profile.location}</p>
			{/if}
			<ProfileLinks links={data.profile.links} />
		</div>
		<dl>
			{#each stats as stat (stat.label)}
				<div>
					<dd>{stat.value}</dd>
					<dt>{stat.label}</dt>
				</div>
			{/each}
		</dl>
	</header>
{/if}

<ProfileNav />

<div class="columns profile-page">
	<div class="main">
		{#if data.favourites.some((work) => work !== null)}
			<section>
				<h2 class="section-title">{m.profile_favourites()}</h2>
				<ul class="posters">
					{#each data.favourites as work, index (index)}
						<li>
							{#if work}
								<FilmPoster film={{ ...work, id: work.externalId }} size="medium" />
							{:else}
								<span class="slot"></span>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.recent.length > 0}
			<section>
				<h2 class="section-title split-title">
					<span>{m.profile_recent()}</span>
					<a href={resolve('/(app)/activity')}>{m.profile_all()}</a>
				</h2>
				<ul class="posters">
					{#each data.recent as entry (entry.id)}
						<li>
							<FilmPoster film={{ ...entry.work, id: entry.work.externalId }} size="medium" />
							<p class="meta">
								{#if entry.rating !== null}<RatingDisplay rating={entry.rating} {scale} />{/if}
								{#if entry.liked}<Icon name="heart" filled label={m.action_liked()} />{/if}
								{#if entry.rewatch}<Icon name="rewatch" label={m.diary_column_rewatch()} />{/if}
								{#if entry.review}<Icon name="review" label={m.diary_column_review()} />{/if}
							</p>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.pinned.length > 0}
			<section>
				<h2 class="section-title split-title">
					<span>{m.profile_pinned()}</span>
					<a href={resolve('/(app)/reviews')}>{m.profile_all()}</a>
				</h2>
				{#each data.pinned as entry (entry.id)}
					<ReviewCard {entry} {scale} />
				{/each}
			</section>
		{/if}

		{#if data.reviews.length > 0}
			<section>
				<h2 class="section-title split-title">
					<span>{m.profile_recent_reviews()}</span>
					<a href={resolve('/(app)/reviews')}>{m.profile_all()}</a>
				</h2>
				{#each data.reviews as entry (entry.id)}
					<ReviewCard {entry} {scale} />
				{/each}
			</section>
		{/if}

		{#if data.tags.length > 0}
			<section class="tags">
				<h2 class="section-title split-title">
					<a href={resolve('/(app)/tags')}>{m.profile_tab_tags()}</a>
					<a href={resolve('/(app)/tags')}>{String(data.tags.length)}</a>
				</h2>
				<ul>
					{#each data.tags as tag (tag.name)}
						<li>
							<a
								href="{resolve('/(app)/diary')}?{new URLSearchParams({ tag: tag.name }).toString()}"
							>
								{tag.name}
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>

	<aside>
		{#if longBio}<p class="bio side-bio">{data.profile.bio}</p>{/if}
		{#if diary.length > 0}
			<section>
				<h2 class="section-title split-title">
					<a href={resolve('/(app)/diary')}>{m.nav_diary()}</a>
					<a href={resolve('/(app)/diary')}>{String(data.diaryCount)}</a>
				</h2>
				<ul class="diary">
					{#each diary as { entry, month, day } (entry.id)}
						<li>
							<span class="month">
								{#if month}<span>{month}</span>{/if}
							</span>
							<span class="day">{day}</span>
							<a href={resolve(workRoute(entry.work.kind), { id: entry.work.externalId })}>
								{entry.work.title}
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section>
			<h2 class="section-title split-title">
				<a href={resolve('/(app)/watched')}>{m.profile_ratings()}</a>
				<a href={resolve('/(app)/watched')}>{String(ratedCount)}</a>
			</h2>
			{#if ratedCount > 0}
				<RatingHistogram counts={data.histogram} {scale} />
			{:else}
				<p class="none">{m.profile_ratings_empty()}</p>
			{/if}
		</section>

		{#if data.lists.length > 0}
			<section>
				<h2 class="section-title split-title">
					<a href={resolve('/(app)/profile/lists')}>{m.profile_recent_lists()}</a>
					<a href={resolve('/(app)/profile/lists')}>{String(data.stats.lists)}</a>
				</h2>
				<ul class="lists">
					{#each data.lists as list (list.id)}
						<li>
							<ListStack
								works={list.preview.map((work) => ({ ...work, id: work.externalId }))}
								href={resolve('/(app)/profile/lists/[id]', { id: String(list.id) })}
							/>
							<p>
								<a
									class="list-name"
									href={resolve('/(app)/profile/lists/[id]', { id: String(list.id) })}
								>
									{list.name}
								</a>
								<span>{m.list_count({ count: list.count })}</span>
							</p>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if activity.length > 0}
			<section>
				<h2 class="section-title split-title">
					<span>{m.nav_activity()}</span>
					<a href={resolve('/(app)/activity')}>{m.profile_all()}</a>
				</h2>
				<ul class="timeline">
					{#each activity as { event, before, after }, index (index)}
						<li>
							{before}<a href={resolve(workRoute(event.work.kind), { id: event.work.externalId })}>
								{event.work.title}
							</a>{after}
							{#if event.rating !== null}<RatingDisplay rating={event.rating} {scale} />{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</aside>
</div>

<style>
	:global(body:has(.profile-page)) {
		--color-background: var(--color-background-profile);
		--color-background-clear: var(--color-background-profile-clear);
		--color-background-veil: var(--color-background-profile-veil);
		--texture-grain: none;
		background: var(--color-background-profile);
	}

	.head {
		display: flex;
		gap: var(--space-6);
		align-items: flex-start;
		margin-bottom: var(--space-6);
	}

	.with-banner {
		margin-top: var(--profile-offset);
	}

	.identity {
		flex: 1;
		min-width: 0;
		padding-top: var(--space-2);
	}

	.name {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		align-items: center;
	}

	.username {
		color: var(--color-heading);
		font-size: var(--font-size-heading);
		font-weight: 700;
	}

	.edit {
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-secondary);
		box-shadow: var(--shadow-button);
		color: var(--color-secondary-text);
		font-size: var(--font-size-small);
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.edit:hover {
		background: var(--color-secondary-hover);
		color: var(--color-heading);
	}

	.bio {
		max-width: 34rem;
		margin-top: var(--space-2);
		overflow-wrap: anywhere;
		white-space: pre-line;
	}

	.side-bio {
		max-width: none;
		margin: 0;
		color: var(--color-text);
		font-size: var(--font-size-small);
		line-height: 1.6;
	}

	.location {
		margin-top: var(--space-2);
		color: var(--color-text-muted);
	}

	dl {
		display: flex;
		margin: 0;
		padding-top: var(--space-2);
	}

	dl div {
		padding: 0 var(--space-3);
		border-inline-start: 1px solid var(--color-border);
		text-align: center;
	}

	dl div:first-child {
		border: 0;
	}

	dl div:last-child {
		padding-inline-end: 0;
	}

	dd {
		margin: 0;
		color: var(--color-heading);
		text-shadow: var(--shadow-header-text);
		font-family: var(--font-display);
		font-size: var(--font-size-heading);
		font-weight: 900;
		line-height: 1.1;
	}

	dt {
		color: var(--color-text);
		text-shadow: var(--shadow-header-text);
		font-size: var(--font-size-micro);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.columns {
		display: grid;
		grid-template-columns: minmax(0, 1fr) var(--sidebar-width);
		gap: var(--space-12);
		align-items: start;
	}

	.main,
	aside {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.split-title {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.split-title a {
		color: inherit;
	}

	.split-title a:last-child {
		font-size: var(--font-size-small);
	}

	.split-title a:hover {
		color: var(--color-link-hover);
	}

	.posters {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.posters :global(.poster) {
		width: 100%;
	}

	.slot {
		display: block;
		aspect-ratio: 2 / 3;
	}

	.meta {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		min-height: 1.5em;
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	.meta :global(.rating) {
		color: var(--color-text-muted);
	}

	.tags ul {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.tags li a {
		display: block;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-chip);
		box-shadow: var(--shadow-chip);
		color: var(--color-text);
		font-size: var(--font-size-small);
	}

	.tags li a:hover {
		background: var(--color-chip-hover);
		color: var(--color-heading);
	}

	.none {
		color: var(--color-text-muted);
		font-size: var(--font-size-control);
	}

	.diary,
	.lists,
	.timeline {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.diary li {
		display: grid;
		grid-template-columns: 2.25rem 1.5rem minmax(0, 1fr);
		gap: var(--space-2);
		align-items: baseline;
		padding: var(--space-1) 0;
	}

	.month span {
		display: block;
		padding: var(--space-1) 0;
		border-top: 3px solid var(--color-secondary);
		border-radius: var(--radius-small);
		background: var(--color-panel);
		color: var(--color-text);
		font-size: var(--font-size-micro);
		font-weight: 700;
		line-height: 1;
		letter-spacing: var(--letter-spacing-caps);
		text-align: center;
		text-transform: uppercase;
	}

	.day {
		color: var(--color-text-muted);
		text-align: end;
	}

	.diary a {
		overflow: hidden;
		color: var(--color-text-strong);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.diary a:hover,
	.timeline a:hover,
	.list-name:hover {
		color: var(--color-link-hover);
	}

	.lists li {
		margin-bottom: var(--space-4);
	}

	.lists :global(.stack) {
		margin-bottom: var(--space-2);
	}

	.list-name {
		margin-inline-end: var(--space-1);
		color: var(--color-heading);
		font-weight: 700;
	}

	.lists span {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	.timeline {
		margin-inline-start: var(--space-1);
	}

	.timeline li {
		position: relative;
		padding: 0 0 var(--space-3) var(--space-4);
		color: var(--color-text-muted);
		font-size: var(--font-size-control);
	}

	.timeline li::before {
		position: absolute;
		z-index: 1;
		top: 0.4em;
		left: -4px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-secondary);
		content: '';
	}

	.timeline li:not(:last-child)::after {
		position: absolute;
		top: calc(0.4em + 4px);
		bottom: calc(-0.4em - 4px);
		left: -1px;
		width: 2px;
		background: var(--color-border-subtle);
		content: '';
	}

	.timeline a {
		color: var(--color-text-strong);
	}

	.timeline :global(.rating) {
		color: var(--color-text-muted);
	}

	@media (max-width: 48rem) {
		.head {
			flex-wrap: wrap;
		}

		.columns {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
