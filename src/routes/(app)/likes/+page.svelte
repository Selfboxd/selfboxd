<script lang="ts">
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PublicListCard from '#lib/components/library/PublicListCard.svelte';
	import RatingDisplay from '#lib/components/library/RatingDisplay.svelte';
	import ProfileNav from '#lib/components/profile/ProfileNav.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const scale = $derived(data.user?.ratingScale ?? 'stars');
	const id = $props.id();
</script>

<svelte:head>
	<title>{m.profile_tab_likes()} - Selfboxd</title>
</svelte:head>

<ProfileNav />

<h1 class="sr-only">{m.profile_tab_likes()}</h1>

<section aria-labelledby="{id}-films">
	<h2 class="section-title" id="{id}-films">{m.likes_films()}</h2>
	{#if data.films.length === 0}
		<p>{m.likes_empty()}</p>
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
</section>

<section class="lists" aria-labelledby="{id}-lists">
	<h2 class="section-title" id="{id}-lists">{m.likes_lists()}</h2>
	{#if data.lists.length === 0}
		<p>{m.likes_lists_empty()}</p>
	{:else}
		<div class="cards">
			{#each data.lists as list (JSON.stringify(list.target))}
				<PublicListCard
					list={{ ...list, likes: null }}
					target={'public' in list.target ? { list: list.target.public } : list.target}
					row
				/>
			{/each}
		</div>
	{/if}
</section>

<style>
	.lists {
		margin-top: var(--space-12);
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-4) var(--space-8);
	}

	@media (max-width: 48rem) {
		.cards {
			grid-template-columns: minmax(0, 1fr);
		}
	}

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
