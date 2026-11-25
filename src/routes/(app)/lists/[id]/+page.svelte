<script lang="ts">
	import { resolve } from '$app/paths';
	import FilmPoster from '#lib/components/film/FilmPoster.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const list = $derived(data.list);
</script>

<svelte:head>
	<title>{list.name} - Selfboxd</title>
</svelte:head>

<header class="head">
	<div>
		<h1>{list.name}</h1>
		<p class="count">{m.list_count({ count: list.items.length })}</p>
	</div>
	<a
		class="button button-secondary"
		href={resolve('/(app)/lists/[id]/edit', { id: String(list.id) })}
	>
		{m.list_edit()}
	</a>
</header>

{#if list.description}<p class="description">{list.description}</p>{/if}

{#if list.items.length === 0}
	<p>{m.list_empty()}</p>
{:else}
	<svelte:element this={list.ranked ? 'ol' : 'ul'} class="grid">
		{#each list.items as { work, note }, index (work.id)}
			<li>
				<FilmPoster film={{ ...work, id: work.externalId }} size="medium" />
				{#if list.ranked}<p class="rank">{index + 1}</p>{/if}
				{#if note}<p class="note">{note}</p>{/if}
			</li>
		{/each}
	</svelte:element>
{/if}

<style>
	.head {
		display: flex;
		gap: var(--space-4);
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: var(--space-4);
		padding-bottom: var(--space-3);
		border-bottom: 1px solid var(--color-border);
	}

	h1 {
		font-size: var(--font-size-title);
		font-weight: 700;
	}

	.count {
		color: var(--color-text-muted);
		font-size: var(--font-size-control);
	}

	.description {
		max-width: 40rem;
		margin-bottom: var(--space-6);
		font-family: var(--font-heading);
		font-size: var(--font-size-prose);
		white-space: pre-line;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, var(--poster-medium));
		gap: var(--space-4) var(--space-2);
		justify-content: space-between;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.rank {
		margin-top: var(--space-1);
		color: var(--color-text-strong);
		font-weight: 700;
		text-align: center;
	}

	.note {
		margin-top: var(--space-1);
		font-size: var(--font-size-control);
		overflow-wrap: anywhere;
	}
</style>
