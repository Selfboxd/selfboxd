<script lang="ts">
	import { resolve } from '$app/paths';
	import ListStack from '#lib/components/library/ListStack.svelte';
	import ProfileNav from '#lib/components/profile/ProfileNav.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.lists_title()} - Selfboxd</title>
</svelte:head>

<ProfileNav />

<header class="head">
	<h1 class="section-title">{m.lists_title()}</h1>
	<a class="button button-primary" href={resolve('/(app)/profile/lists/new')}>{m.lists_new()}</a>
</header>

{#if data.lists.length === 0}
	<p>{m.lists_empty()}</p>
{:else}
	<ul>
		{#each data.lists as list (list.id)}
			<li>
				<div class="stack">
					<ListStack
						works={list.preview.map((work) => ({ ...work, id: work.externalId }))}
						href={resolve('/(app)/profile/lists/[id]', { id: String(list.id) })}
					/>
				</div>
				<div class="text">
					<h2>
						<a href={resolve('/(app)/profile/lists/[id]', { id: String(list.id) })}>{list.name}</a>
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
		width: var(--list-stack-width);
		flex-shrink: 0;
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
