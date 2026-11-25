<script lang="ts">
	import { resolve } from '$app/paths';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.lists_title()} - Selfboxd</title>
</svelte:head>

<header class="head">
	<h1 class="section-title">{m.lists_title()}</h1>
	<a class="button button-primary" href={resolve('/(app)/lists/new')}>{m.lists_new()}</a>
</header>

{#if data.lists.length === 0}
	<p>{m.lists_empty()}</p>
{:else}
	<ul>
		{#each data.lists as list (list.id)}
			<li>
				<a class="stack" href={resolve('/(app)/lists/[id]', { id: String(list.id) })} tabindex="-1">
					{#each list.preview as work (work.id)}
						<FilmPoster film={{ ...work, id: work.externalId }} size="small" linked={false} />
					{/each}
				</a>
				<div class="text">
					<h2>
						<a href={resolve('/(app)/lists/[id]', { id: String(list.id) })}>{list.name}</a>
					</h2>
					<p class="count">{m.list_count({ count: list.count })}</p>
					{#if list.description}<p class="description">{list.description}</p>{/if}
				</div>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.head {
		display: flex;
		gap: var(--space-4);
		align-items: flex-start;
	}

	.head h1 {
		flex: 1;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		gap: var(--space-6);
		align-items: center;
		padding: var(--space-4) 0;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.stack {
		display: flex;
		flex-shrink: 0;
		width: var(--list-stack-width);
		min-height: var(--list-stack-height);
		border-radius: var(--radius-medium);
		background: var(--color-chip);
	}

	.stack :global(.poster) {
		flex-shrink: 0;
		box-shadow: var(--shadow-poster-stack);
	}

	.stack :global(.poster + .poster) {
		margin-inline-start: calc(-1 * var(--list-stack-overlap));
	}

	h2 {
		font-family: var(--font-body);
		font-size: var(--font-size-large);
		font-weight: 700;
	}

	h2 a {
		color: var(--color-heading);
	}

	h2 a:hover {
		color: var(--color-link-hover);
	}

	.count {
		color: var(--color-text-muted);
		font-size: var(--font-size-control);
	}

	.description {
		display: -webkit-box;
		overflow: hidden;
		margin-top: var(--space-2);
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		white-space: pre-line;
	}
</style>
