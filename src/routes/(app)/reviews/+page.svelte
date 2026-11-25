<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import ProfileNav from '#lib/components/profile/ProfileNav.svelte';
	import ReviewCard from '#lib/components/profile/ReviewCard.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const scale = $derived(data.user?.ratingScale ?? 'stars');
</script>

<svelte:head>
	<title>{m.profile_tab_reviews()} - Selfboxd</title>
</svelte:head>

<ProfileNav />

<h1 class="section-title">{m.profile_tab_reviews()}</h1>

{#if form?.error}
	<FormError message={errorMessage(form.error)} />
{/if}

{#if data.reviews.length === 0}
	<p>{m.reviews_empty()}</p>
{:else}
	{#each data.reviews as entry (entry.id)}
		<ReviewCard {entry} {scale}>
			{#snippet actions()}
				<form method="POST" action="?/pin" use:enhance>
					<input type="hidden" name="entryId" value={entry.id} />
					<input type="hidden" name="pinned" value={String(!entry.pinned)} />
					<button class="pin" class:pinned={entry.pinned}>
						{entry.pinned ? m.review_unpin() : m.review_pin()}
					</button>
				</form>
			{/snippet}
		</ReviewCard>
	{/each}
{/if}

<style>
	.pin {
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-text-muted);
		font: inherit;
		font-size: var(--font-size-control);
		font-weight: 700;
		cursor: pointer;
	}

	.pin:hover,
	.pinned {
		color: var(--color-text-strong);
	}
</style>
