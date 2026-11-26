<script lang="ts">
	import { resolve } from '$app/paths';
	import WatchedView from '#lib/components/library/WatchedView.svelte';
	import ProfileNav from '#lib/components/profile/ProfileNav.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.watched_series_title()} - Selfboxd</title>
</svelte:head>

<ProfileNav />

<WatchedView
	title={m.watched_series_title()}
	empty={m.watched_series_empty()}
	path={resolve('/(app)/watched/series')}
	works={data.works}
	total={data.total}
	options={data.options}
	decades={data.decades}
	genres={data.genres}
	services={data.services}
	scale={data.user?.ratingScale ?? 'stars'}
/>
