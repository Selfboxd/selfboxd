<script lang="ts">
	import { resolve } from '$app/paths';
	import { chartPageSize } from '#lib/catalog/charts.js';
	import ListView from '#lib/components/library/ListView.svelte';
	import { chartName } from '#lib/i18n/charts.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const name = $derived(chartName(data.chart));
	const path = $derived(resolve('/(app)/lists/official/[chart]', { chart: data.chart }));
	const entries = $derived(
		data.films.map((film, index) => ({
			film,
			position: (data.page - 1) * chartPageSize + index + 1,
			note: ''
		}))
	);
</script>

<svelte:head>
	<title>{name} - Selfboxd</title>
</svelte:head>

<ListView
	{name}
	owner="TMDB"
	count={null}
	backdropPath={data.backdropPath}
	{entries}
	empty={m.chart_empty()}
	progress={null}
>
	{#if data.totalPages > 1}
		<nav class="pages" aria-label={name}>
			{#if data.page > 1}
				<a class="button button-secondary" href="{path}?page={data.page - 1}">
					{m.search_previous()}
				</a>
			{/if}
			{#if data.page < data.totalPages}
				<a class="button button-secondary next" href="{path}?page={data.page + 1}">
					{m.search_next()}
				</a>
			{/if}
		</nav>
	{/if}
</ListView>

<style>
	.pages {
		display: flex;
		margin-top: var(--space-6);
	}

	.pages .next {
		margin-inline-start: auto;
	}
</style>
