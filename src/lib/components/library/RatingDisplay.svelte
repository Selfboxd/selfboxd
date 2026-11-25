<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import type { RatingScale } from '#lib/catalog/library.js';
	import { ratingLabel } from '#lib/i18n/ratings.js';

	interface Props {
		/** Stored rating, from 1 to 10. */
		rating: number;
		scale: RatingScale;
	}

	let { rating, scale }: Props = $props();

	const fullStars = $derived(Array.from({ length: Math.floor(rating / 2) }, (_, index) => index));
</script>

<span class="rating" role="img" aria-label={ratingLabel(rating, scale)}>
	{#if scale === 'stars'}
		{#each fullStars as star (star)}<Icon name="star" filled />{/each}{#if rating % 2 === 1}<span
				class="half"
			>
				½
			</span>{/if}
	{:else}
		<span class="ten">{rating}<span class="out-of">/10</span></span>
	{/if}
</span>

<style>
	.rating {
		display: inline-flex;
		align-items: center;
		color: var(--color-rating);
		white-space: nowrap;
	}

	.half {
		margin-inline-start: 0.1em;
		font-weight: 700;
	}

	.ten {
		font-weight: 700;
	}

	.out-of {
		font-weight: 400;
		opacity: 0.7;
	}
</style>
