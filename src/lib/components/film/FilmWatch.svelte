<script lang="ts">
	import { tmdbImage } from '#lib/images.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { Provider, WatchProviders } from '#lib/catalog/film.js';

	interface Props {
		/** Offers in the country of the user, or `null` when there is none. */
		watch: WatchProviders | null;
	}

	let { watch }: Props = $props();

	const groups = $derived<{ label: string; providers: Provider[] }[]>(
		watch
			? [
					{ label: m.film_watch_stream(), providers: watch.stream },
					{ label: m.film_watch_rent(), providers: watch.rent },
					{ label: m.film_watch_buy(), providers: watch.buy }
				].filter((group) => group.providers.length > 0)
			: []
	);
</script>

<section class="watch">
	<h2>{m.film_where_to_watch()}</h2>
	{#if groups.length === 0}
		<p class="none">{m.film_watch_none()}</p>
	{:else}
		{#each groups as group (group.label)}
			<h3>{group.label}</h3>
			<ul>
				{#each group.providers as provider (provider.id)}
					<li>
						{#if provider.logoPath}
							<img src={tmdbImage(provider.logoPath, 'w92')} alt="" loading="lazy" />
						{/if}
						<span>{provider.name}</span>
					</li>
				{/each}
			</ul>
		{/each}
		{#if watch}
			<a href={watch.link} target="_blank" rel="external noopener noreferrer">
				{m.film_watch_all()}
			</a>
		{/if}
	{/if}
	<p class="source">{m.film_watch_source()}</p>
</section>

<style>
	.watch {
		border-radius: var(--radius-medium);
		background: var(--color-panel);
		font-size: var(--font-size-control);
	}

	h2 {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-background);
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-small);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	h3 {
		padding: var(--space-2) var(--space-3) 0;
		color: var(--color-text-muted);
		font-family: var(--font-body);
		font-size: var(--font-size-small);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	ul {
		margin: 0;
		padding: var(--space-1) var(--space-3);
		list-style: none;
	}

	li {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-1) 0;
		color: var(--color-text-strong);
	}

	img {
		width: var(--avatar-small);
		height: var(--avatar-small);
		border-radius: var(--radius-small);
	}

	a,
	.none,
	.source {
		display: block;
		padding: var(--space-2) var(--space-3);
	}

	.source {
		border-top: 1px solid var(--color-background);
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}
</style>
