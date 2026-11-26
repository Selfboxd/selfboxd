<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { imageKey, type ImageChoices } from '#lib/catalog/images.js';
	import { tmdbImage, type TmdbImageSize } from '#lib/images.js';
	import type { FilmSummary } from '#lib/catalog/film.js';
	import type { WorkKind } from '#lib/catalog/library.js';
	import { workRoute } from '#lib/paths.js';
	import Tooltip from '#lib/components/Tooltip.svelte';
	import PosterActions from './PosterActions.svelte';
	import type { PosterSeason } from '#lib/components/library/log-target.js';

	interface Props {
		/** The film or series whose poster is shown; a film unless `kind` says otherwise. */
		film: Pick<FilmSummary, 'title' | 'year' | 'posterPath'> & {
			id: number | string;
			kind?: WorkKind;
		};
		/** Rendered width of the poster. */
		size?: 'tiny' | 'small' | 'medium' | 'large' | 'fill';
		/** Whether the poster links to the page of the film. */
		linked?: boolean;
		/** Whether hovering the poster offers the quick actions; follows `linked` by default. */
		actions?: boolean;
		/** The season of a series the poster shows, for the quick actions. */
		season?: PosterSeason | undefined;
		/** Second line of the tooltip, such as the character a person plays. */
		note?: string | undefined;
	}

	let { film, size = 'medium', linked = true, actions = linked, season, note }: Props = $props();

	const imageSizes: Record<NonNullable<Props['size']>, TmdbImageSize> = {
		tiny: 'w92',
		small: 'w154',
		medium: 'w342',
		large: 'w500',
		fill: 'w342'
	};

	/** Poster the account chose for the work; a season keeps its own. */
	const chosen = $derived(
		season
			? null
			: (page.data.images as ImageChoices | undefined)?.[imageKey(film.kind ?? 'film', film.id)]
					?.poster
	);
	const posterPath = $derived(chosen ?? film.posterPath);

	const label = $derived(film.year ? `${film.title} (${String(film.year)})` : film.title);

	let hovered = $state(false);
</script>

{#snippet picture()}
	{#if posterPath}
		<img src={tmdbImage(posterPath, imageSizes[size])} alt={linked ? '' : label} loading="lazy" />
	{:else}
		<span class="placeholder">{film.title}</span>
	{/if}
{/snippet}

<div
	class="poster {size}"
	class:interactive={linked || actions}
	role="presentation"
	onpointerenter={() => (hovered = linked)}
	onpointerleave={() => (hovered = false)}
>
	{#if hovered}
		<Tooltip>
			<span>{label}</span>
			{#if note}<span class="note">{note}</span>{/if}
		</Tooltip>
	{/if}
	{#if linked}
		<a href={resolve(workRoute(film.kind ?? 'film'), { id: String(film.id) })} aria-label={label}>
			{@render picture()}
		</a>
	{:else}
		{@render picture()}
	{/if}
	{#if actions && size !== 'tiny'}<PosterActions film={{ ...film, posterPath }} {season} />{/if}
</div>

<style>
	.poster {
		position: relative;
		display: block;
		flex-shrink: 0;
		aspect-ratio: 2 / 3;
		border-radius: var(--radius-medium);
		background: var(--color-panel);
		box-shadow: var(--shadow-poster);
		container-type: inline-size;
	}

	.poster::after {
		position: absolute;
		border-radius: inherit;
		box-shadow: var(--shadow-poster-frame);
		content: '';
		inset: 0;
		pointer-events: none;
		transition: box-shadow var(--duration-medium) var(--ease-out);
	}

	.interactive:hover::after,
	.interactive:focus-within::after {
		box-shadow: var(--shadow-poster-hover);
	}

	a {
		display: block;
		height: 100%;
	}

	.tiny {
		width: var(--poster-tiny);
		border-radius: var(--radius-small);
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

	.fill {
		width: 100%;
	}

	img {
		width: 100%;
		height: 100%;
		border-radius: inherit;
		object-fit: cover;
	}

	a,
	.placeholder {
		border-radius: inherit;
	}

	.note {
		color: var(--color-text);
		font-size: var(--font-size-small);
		font-weight: 400;
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
