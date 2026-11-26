<script lang="ts">
	import { tmdbImage, type TmdbImageSize } from '#lib/images.js';

	interface Props {
		/** Path of the TMDB profile picture, or `null` for the placeholder. */
		path: string | null;
		name: string;
		size: TmdbImageSize;
	}

	let { path, name, size }: Props = $props();
</script>

{#if path}
	<img class="photo" src={tmdbImage(path, size)} alt={name} loading="lazy" />
{:else}
	<span class="photo blank" role="img" aria-label={name}>
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path
				d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95z"
			/>
		</svg>
	</span>
{/if}

<style>
	.photo {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.blank {
		display: grid;
		background: var(--color-chip);
		color: var(--color-text-faint);
		place-items: center;
	}

	svg {
		width: 42%;
		height: 42%;
		fill: currentColor;
	}
</style>
