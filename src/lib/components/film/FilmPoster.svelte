<script lang="ts">
	import { resolve } from '$app/paths';
	import { tmdbImage, type TmdbImageSize } from '#lib/images.js';
	import type { FilmSummary } from '#lib/catalog/film.js';

	interface Props {
		/** The film whose poster is shown. */
		film: FilmSummary;
		/** Rendered width of the poster. */
		size?: 'small' | 'medium' | 'large';
		/** Whether the poster links to the page of the film. */
		linked?: boolean;
	}

	let { film, size = 'medium', linked = true }: Props = $props();

	const imageSizes: Record<NonNullable<Props['size']>, TmdbImageSize> = {
		small: 'w154',
		medium: 'w342',
		large: 'w500'
	};

	const label = $derived(film.year ? `${film.title} (${String(film.year)})` : film.title);
</script>

{#snippet picture()}
	{#if film.posterPath}
		<img src={tmdbImage(film.posterPath, imageSizes[size])} alt={label} loading="lazy" />
	{:else}
		<span class="placeholder">{film.title}</span>
	{/if}
{/snippet}

{#if linked}
	<a
		class="poster {size}"
		href={resolve('/(app)/film/[id]', { id: String(film.id) })}
		title={label}
	>
		{@render picture()}
	</a>
{:else}
	<span class="poster {size}">{@render picture()}</span>
{/if}

<style>
	.poster {
		position: relative;
		display: block;
		flex-shrink: 0;
		overflow: hidden;
		aspect-ratio: 2 / 3;
		border-radius: var(--radius-medium);
		background: var(--color-panel);
		box-shadow: var(--shadow-poster);
	}

	.poster::after {
		position: absolute;
		border-radius: inherit;
		box-shadow: var(--shadow-poster-frame);
		content: '';
		inset: 0;
		pointer-events: none;
	}

	a.poster:hover::after,
	a.poster:focus-visible::after {
		box-shadow: var(--shadow-poster-hover);
	}

	.small {
		width: var(--poster-small);
	}

	.medium {
		width: var(--poster-medium);
	}

	.large {
		width: var(--poster-large);
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.placeholder {
		display: flex;
		height: 100%;
		align-items: center;
		justify-content: center;
		padding: var(--space-2);
		color: var(--color-text);
		font-size: var(--font-size-small);
		text-align: center;
	}
</style>
