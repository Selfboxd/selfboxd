<script lang="ts">
	import ListView from '#lib/components/library/ListView.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const list = $derived(data.list);
</script>

<svelte:head>
	<title>{list.name} - Selfboxd</title>
</svelte:head>

<ListView
	target={{ personal: list.id }}
	name={list.name}
	description={list.description}
	owner={data.user?.username ?? null}
	account={data.user ?? undefined}
	count={list.items.length}
	backdropPath={data.backdropPath}
	entries={data.entries}
	empty={m.list_empty()}
	progress={data.progress}
	options={data.options}
	decades={data.decades}
	genres={data.genres}
	liked={data.liked}
	ranked={list.ranked}
	updatedAt={list.updatedAt}
/>
