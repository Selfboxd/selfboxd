<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function tagQuery(tag: string): string {
		return new URLSearchParams({ tag }).toString();
	}
</script>

<svelte:head>
	<title>{m.watchlist_title()} - Selfboxd</title>
</svelte:head>

<div class="layout">
	<section>
		<h1 class="section-title">{m.watchlist_title()}</h1>
		{#if data.items.length === 0}
			<p>{data.tag ? m.watchlist_empty_tag() : m.watchlist_empty()}</p>
		{:else}
			<ul class="items">
				{#each data.items as item (item.work.id)}
					<li>
						<FilmPoster film={{ ...item.work, id: item.work.externalId }} size="medium" />
						{#if item.note}<p class="note">{item.note}</p>{/if}
						{#if item.tags.length > 0}
							<p class="tags">
								{#each item.tags as tag (tag)}<span>{tag}</span>{/each}
							</p>
						{/if}
						<form method="POST" action="?/remove" use:enhance>
							<input type="hidden" name="workId" value={item.work.id} />
							<button aria-label="{m.watchlist_remove()}: {item.work.title}">
								<Icon name="close" />
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if data.tags.length > 0}
		<aside>
			<h2 class="section-title">{m.watchlist_filter_title()}</h2>
			<ul class="filters">
				<li>
					<a
						href={resolve('/(app)/watchlist')}
						aria-current={data.tag === null ? 'true' : undefined}
					>
						{m.watchlist_filter_all()}
					</a>
				</li>
				{#each data.tags as tag (tag)}
					<li>
						<a
							href="{resolve('/(app)/watchlist')}?{tagQuery(tag)}"
							aria-current={data.tag === tag ? 'true' : undefined}
						>
							{tag}
						</a>
					</li>
				{/each}
			</ul>
		</aside>
	{/if}
</div>

<style>
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) var(--sidebar-width);
		gap: var(--space-12);
		align-items: start;
	}

	.items {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4) var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.items li {
		position: relative;
		display: flex;
		width: var(--poster-medium);
		flex-direction: column;
		gap: var(--space-1);
	}

	.note {
		overflow-wrap: anywhere;
		font-size: var(--font-size-small);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.tags span {
		padding: 0 var(--space-1);
		border-radius: var(--radius-small);
		background: var(--color-chip);
		font-size: var(--font-size-small);
	}

	.items form {
		position: absolute;
		top: var(--space-1);
		right: var(--space-1);
	}

	.items button {
		display: flex;
		padding: var(--space-1);
		border: 0;
		border-radius: 50%;
		background: var(--color-scrim);
		color: var(--color-heading);
		cursor: pointer;
	}

	.items button:hover {
		background: var(--color-danger-button);
	}

	.filters {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.filters a {
		display: block;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-small);
		color: var(--color-text);
	}

	.filters a:hover {
		color: var(--color-link-hover);
	}

	.filters a[aria-current='true'] {
		background: var(--color-panel);
		color: var(--color-heading);
		font-weight: 700;
	}

	@media (max-width: 48rem) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
