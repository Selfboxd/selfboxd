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

<p class="hint">{m.reviews_pin_hint()}</p>

{#if data.reviews.length === 0}
	<p>{m.reviews_empty()}</p>
{:else}
	{#each data.reviews as entry (entry.id)}
		<ReviewCard {entry} {scale} />
	{/each}
{/if}

<style>
	.hint {
		margin-top: calc(-1 * var(--space-2));
		margin-bottom: var(--space-4);
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}
</style>
