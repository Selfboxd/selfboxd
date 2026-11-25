<script lang="ts">
	import { tmdbImage } from '#lib/images.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { Provider, WatchProviders } from '#lib/catalog/film.js';

	interface Props {
		/** Offers in the country of the user, or `null` when there is none. */
		watch: WatchProviders | null;
		/** Identifier of the YouTube video of the trailer, or `null` without trailer. */
		trailerKey: string | null;
	}

	let { watch, trailerKey }: Props = $props();

	interface Service {
		provider: Provider;
		/** Translated kinds of offer of the service: stream, rent, buy. */
		offers: string[];
	}

	const services = $derived.by((): Service[] => {
		if (!watch) return [];
		const groups: [Provider[], string][] = [
			[watch.stream, m.film_watch_stream()],
			[watch.rent, m.film_watch_rent()],
			[watch.buy, m.film_watch_buy()]
		];
		const result: Service[] = [];
		for (const [providers, label] of groups) {
			for (const provider of providers) {
				const existing = result.find((service) => service.provider.id === provider.id);
				if (existing) existing.offers.push(label);
				else result.push({ provider, offers: [label] });
			}
		}
		return result;
	});
</script>

<section class="watch">
	<header>
		<h2>{m.film_where_to_watch()}</h2>
		{#if trailerKey}
			<a
				class="trailer"
				href="https://www.youtube.com/watch?v={trailerKey}"
				target="_blank"
				rel="noopener noreferrer"
			>
				<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
					<rect width="16" height="16" rx="3" />
					<path d="M6 4.5v7l5.5-3.5z" />
				</svg>
				{m.film_trailer()}
			</a>
		{/if}
	</header>

	{#if services.length === 0}
		<p class="none">{m.film_watch_none()}</p>
	{:else}
		<ul>
			{#each services as service (service.provider.id)}
				<li>
					{#if service.provider.logoPath}
						<img src={tmdbImage(service.provider.logoPath, 'w92')} alt="" loading="lazy" />
					{/if}
					<span class="name">{service.provider.name}</span>
					{#each service.offers as offer (offer)}
						<span class="offer">{offer}</span>
					{/each}
				</li>
			{/each}
		</ul>
	{/if}

	<footer>
		{#if watch && services.length > 0}
			<a href={watch.link} target="_blank" rel="external noopener noreferrer">
				{m.film_watch_all()}
			</a>
		{/if}
		<span class="credit" title={m.film_watch_source()}>{m.film_watch_credit()}</span>
	</footer>
</section>

<style>
	.watch {
		border: 1px solid var(--color-panel);
		border-radius: var(--radius-medium);
		font-size: var(--font-size-control);
	}

	header {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-small) var(--radius-small) 0 0;
		background: var(--color-panel);
	}

	h2 {
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: var(--font-size-small);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.trailer {
		display: flex;
		gap: var(--space-1);
		align-items: center;
		color: var(--color-text);
	}

	.trailer:hover {
		color: var(--color-link-hover);
	}

	.trailer rect {
		fill: currentcolor;
	}

	.trailer path {
		fill: var(--color-panel);
	}

	ul {
		margin: 0;
		padding: 0 var(--space-3);
		list-style: none;
	}

	li {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--color-panel);
	}

	.name {
		overflow: hidden;
		color: var(--color-text-strong);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	img {
		width: var(--avatar-small);
		height: var(--avatar-small);
		border-radius: var(--radius-medium);
	}

	.offer {
		padding: 0 var(--space-1);
		border-radius: var(--radius-small);
		background: var(--color-chip);
		color: var(--color-text-muted);
		font-size: var(--font-size-micro);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.none {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-panel);
	}

	footer {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2) var(--space-3);
	}

	footer a {
		color: var(--color-link-hover);
	}

	footer a:hover {
		color: var(--color-heading);
	}

	.credit {
		margin-inline-start: auto;
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}
</style>
