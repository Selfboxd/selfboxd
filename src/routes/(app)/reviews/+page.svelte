<script lang="ts">
	import ProfileNav from '#lib/components/profile/ProfileNav.svelte';
	import ReviewCard from '#lib/components/profile/ReviewCard.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const scale = $derived(data.user?.ratingScale ?? 'stars');
</script>

<svelte:head>
	<title>{m.profile_tab_reviews()} - Selfboxd</title>
</svelte:head>

<ProfileNav />

<h1 class="section-title">{m.profile_tab_reviews()}</h1>

{#if data.reviews.length === 0}
	<p>{m.reviews_empty()}</p>
{:else}
	{#each data.reviews as entry (entry.id)}
		<ReviewCard {entry} {scale} />
	{/each}
{/if}
