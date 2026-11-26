<script lang="ts">
	import ListView from '#lib/components/library/ListView.svelte';
	import LoadMore from '#lib/components/LoadMore.svelte';
	import { InfinitePages } from '#lib/components/infinite.svelte.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Entry = PageProps['data']['entries'][number];

	const pages = new InfinitePages<Entry>(
		() => ({ items: data.entries, page: data.page, more: data.hasMore }),
		(loaded) => {
			const next = loaded as Partial<Pick<PageProps['data'], 'entries' | 'page' | 'hasMore'>>;
			return next.entries && next.page !== undefined && next.hasMore !== undefined
				? { items: next.entries, page: next.page, more: next.hasMore }
				: null;
		},
		(entry) => `${entry.film.kind ?? 'film'}:${String(entry.film.id)}`
	);
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
	entries={pages.items}
	empty={m.catalogue_list_empty()}
	progress={data.progress}
	options={data.options}
	decades={data.decades}
	genres={data.genres}
	services={data.services}
	liked={data.liked}
	shared={data.shared}
>
	<LoadMore more={pages.more} loading={pages.loading} onmore={() => void pages.next()} />

	<p class="credit">{m.catalogue_lists_credit()}</p>
</ListView>

<style>
	.credit {
		margin-top: var(--space-12);
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}
</style>
