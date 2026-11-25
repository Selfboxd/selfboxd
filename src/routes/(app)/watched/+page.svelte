<script lang="ts">
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import RatingDisplay from '#lib/components/library/RatingDisplay.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const scale = $derived(data.user?.ratingScale ?? 'stars');
</script>

<svelte:head>
	<title>{m.watched_title()} - Selfboxd</title>
</svelte:head>

<h1 class="section-title">{m.watched_title()}</h1>

{#if data.films.length === 0}
	<p>{m.watched_empty()}</p>
{:else}
	<ul>
		{#each data.films as { work, rating, liked } (work.id)}
			<li>
				<FilmPoster film={{ ...work, id: work.externalId }} size="small" />
				<p class="meta">
					{#if rating !== null}<RatingDisplay {rating} {scale} />{/if}
					{#if liked}<span class="liked">
							<Icon name="heart" filled label={m.action_liked()} />
						</span>{/if}
				</p>
			</li>
		{/each}
	</ul>
{/if}

<style>
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, var(--poster-small));
		gap: var(--space-3) var(--space-2);
		justify-content: space-between;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.meta {
		display: flex;
		gap: var(--space-1);
		align-items: center;
		min-height: 1.5em;
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--font-size-micro);
	}

	.meta :global(.rating) {
		color: var(--color-text-muted);
	}

	.liked {
		display: flex;
	}
</style>
