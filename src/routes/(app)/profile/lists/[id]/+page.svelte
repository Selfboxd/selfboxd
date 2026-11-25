<script lang="ts">
	import { resolve } from '$app/paths';
	import ListView from '#lib/components/library/ListView.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const list = $derived(data.list);
	const entries = $derived(
		list.items.map(({ work, note }, index) => ({
			film: { ...work, id: work.externalId },
			position: list.ranked ? index + 1 : null,
			note
		}))
	);
</script>

<svelte:head>
	<title>{list.name} - Selfboxd</title>
</svelte:head>

<ListView
	name={list.name}
	description={list.description}
	owner={data.user?.username ?? null}
	account={data.user ?? undefined}
	count={list.items.length}
	backdropPath={data.backdropPath}
	{entries}
	empty={m.list_empty()}
	progress={data.progress}
>
	{#snippet actions()}
		<a href={resolve('/(app)/profile/lists/[id]/edit', { id: String(list.id) })}>
			{m.list_edit()}
		</a>
	{/snippet}
</ListView>
