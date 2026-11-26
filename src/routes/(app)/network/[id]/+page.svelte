<script lang="ts">
	import CatalogueBrowse from '#lib/components/catalogue/CatalogueBrowse.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import TmdbSetupNotice from '#lib/components/TmdbSetupNotice.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.state === 'ready' ? data.studio.name : m.network_kicker()} - Selfboxd</title>
</svelte:head>

{#if data.state === 'not_configured'}
	<TmdbSetupNotice isAdmin={data.user?.isAdmin ?? false} />
{:else if data.state === 'error'}
	<FormError message={errorMessage(data.error)} />
{:else}
	<CatalogueBrowse
		kind="series"
		target={{ page: 'network', id: data.studio.id }}
		kicker={m.network_kicker()}
		title={data.studio.name}
		genres={data.genres}
		services={data.services}
		filter={data.filter}
		visibility={data.visibility}
		works={data.works}
		page={data.page}
		totalPages={data.totalPages}
		total={data.total}
	/>
{/if}
