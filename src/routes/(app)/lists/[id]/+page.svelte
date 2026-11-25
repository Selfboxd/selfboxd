<script lang="ts">
	import { resolve } from '$app/paths';
	import { listOptionsQuery } from '#lib/catalog/list-view.js';
	import ListView from '#lib/components/library/ListView.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const path = $derived(resolve('/(app)/lists/[id]', { id: String(data.list.id) }));

	function pageQuery(page: number): string {
		const view = listOptionsQuery({ mode: data.options.mode });
		return view ? `${view}&page=${String(page)}` : `page=${String(page)}`;
	}
</script>

<svelte:head>
	<title>{data.list.name} - Selfboxd</title>
</svelte:head>

<ListView
	target={{ public: data.list.id }}
	name={data.list.name}
	owner={data.list.owner}
	count={data.list.itemCount}
	backdropPath={data.backdropPath}
	entries={data.entries}
	empty={m.catalogue_list_empty()}
	progress={data.progress}
	options={data.options}
	decades={data.decades}
	genres={data.genres}
>
	{#if data.page > 1 || data.hasMore}
		<nav class="pages" aria-label={data.list.name}>
			{#if data.page > 1}
				<a class="button button-secondary" href="{path}?{pageQuery(data.page - 1)}">
					{m.search_previous()}
				</a>
			{/if}
			{#if data.hasMore}
				<a class="button button-secondary next" href="{path}?{pageQuery(data.page + 1)}">
					{m.search_next()}
				</a>
			{/if}
		</nav>
	{/if}

	<p class="credit">{m.catalogue_lists_credit()}</p>
</ListView>

<style>
	.pages {
		display: flex;
		margin-top: var(--space-6);
	}

	.pages .next {
		margin-inline-start: auto;
	}

	.credit {
		margin-top: var(--space-12);
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}
</style>
