<script lang="ts">
	import ListView from '#lib/components/library/ListView.svelte';
	import LoadMore from '#lib/components/LoadMore.svelte';
	import { InfinitePages } from '#lib/components/infinite.svelte.js';
	import { chartName } from '#lib/i18n/charts.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Entry = PageProps['data']['entries'][number];

	const pages = new InfinitePages<Entry>(
		() => ({ items: data.entries, page: data.page, more: data.page < data.totalPages }),
		(loaded) => {
			const next = loaded as Partial<Pick<PageProps['data'], 'entries' | 'page' | 'totalPages'>>;
			return next.entries && next.page !== undefined && next.totalPages !== undefined
				? { items: next.entries, page: next.page, more: next.page < next.totalPages }
				: null;
		},
		(entry) => `${entry.film.kind ?? 'film'}:${String(entry.film.id)}`
	);

	const name = $derived(chartName(data.chart));
</script>

<svelte:head>
	<title>{name} - Selfboxd</title>
</svelte:head>

<ListView
	target={{ chart: data.chart }}
	{name}
	owner="TMDB"
	count={null}
	backdropPath={data.backdropPath}
	entries={pages.items}
	empty={m.chart_empty()}
	progress={null}
	options={data.options}
	decades={data.decades}
	genres={data.genres}
	services={data.services}
	liked={data.liked}
>
	<LoadMore more={pages.more} loading={pages.loading} onmore={() => void pages.next()} />
</ListView>
