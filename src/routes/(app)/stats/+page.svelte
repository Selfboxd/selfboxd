<script lang="ts">
	import { resolve } from '$app/paths';
	import ProfileNav from '#lib/components/profile/ProfileNav.svelte';
	import StatsView from '#lib/components/stats/StatsView.svelte';
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
/>
