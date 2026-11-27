<script lang="ts">
	import { resolve } from '$app/paths';
	import ProfileNav from '#lib/components/profile/ProfileNav.svelte';
	import StatsView from '#lib/components/stats/StatsView.svelte';
	import type { StatsTarget } from '#lib/catalog/stats.js';
	import { defaultWatchedOptions, watchedQuery } from '#lib/catalog/watched-view.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function address(year: number | null, kind: string | null): string {
		const query = new URLSearchParams({
			...(year === null ? {} : { year: String(year) }),
			...(kind === null ? {} : { kind })
		}).toString();
		return `${resolve('/(app)/stats')}${query ? `?${query}` : ''}`;
	}

	const name = $derived(data.user?.username ?? '');

	function withQuery(path: string, query: string): string {
		return query ? `${path}?${query}` : path;
	}

	function link(target: StatsTarget): string | null {
		switch (target.to) {
			case 'works': {
				const { rating, ...filter } = target.filter;
				const path =
					data.kind === 'series' ? resolve('/(app)/watched/series') : resolve('/(app)/watched');
				return withQuery(
					path,
					watchedQuery({
						...defaultWatchedOptions,
						...filter,
						...(rating === undefined ? {} : { rating: { min: rating, max: rating } })
					})
				);
			}
			case 'diary':
				return withQuery(
					resolve('/(app)/diary'),
					target.year === undefined ? '' : `year=${String(target.year)}`
				);
			case 'reviews':
				return resolve('/(app)/reviews');
			case 'person':
				return resolve('/(app)/person/[id]', { id: String(target.id) });
			case 'studio':
				return resolve('/(app)/studio/[id]', { id: String(target.id) });
		}
	}
	const periods = $derived([
		{ label: m.stats_all_time(), href: address(null, data.kind), current: data.year === null },
		...data.years.map((year) => ({
			label: String(year),
			href: address(year, data.kind),
			current: data.year === year
		}))
	]);
	const kinds = $derived([
		{ label: m.stats_all(), href: address(data.year, null), current: data.kind === null },
		{ label: m.nav_films(), href: address(data.year, 'film'), current: data.kind === 'film' },
		{ label: m.nav_series(), href: address(data.year, 'series'), current: data.kind === 'series' }
	]);
</script>

<svelte:head>
	<title>{m.profile_tab_stats()} - Selfboxd</title>
</svelte:head>

<ProfileNav />

<StatsView
	stats={data.stats}
	scale={data.user?.ratingScale ?? 'stars'}
	title={data.year === null ? m.stats_title_all() : m.stats_title_year({ year: String(data.year) })}
	subtitle={data.year === null ? m.stats_subtitle_all({ name }) : m.stats_subtitle_year({ name })}
	{periods}
	{kinds}
	yearly={data.year !== null}
	year={data.year}
	{link}
/>
