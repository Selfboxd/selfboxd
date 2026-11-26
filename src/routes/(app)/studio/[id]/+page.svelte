<script lang="ts">
	import { resolve } from '$app/paths';
	import CatalogueBrowse from '#lib/components/catalogue/CatalogueBrowse.svelte';
	import FormError from '#lib/components/FormError.svelte';
	import TmdbSetupNotice from '#lib/components/TmdbSetupNotice.svelte';
	import { errorMessage } from '#lib/i18n/errors.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.state === 'ready' ? data.studio.name : m.studio_kicker()} - Selfboxd</title>
</svelte:head>

{#if data.state === 'not_configured'}
	<TmdbSetupNotice isAdmin={data.user?.isAdmin ?? false} />
{:else if data.state === 'error'}
	<FormError message={errorMessage(data.error)} />
{:else}
	{@const path = resolve('/(app)/studio/[id]', { id: String(data.studio.id) })}
	<CatalogueBrowse
		kind={data.kind}
		target={{ page: 'studio', id: data.studio.id }}
		kicker={m.studio_kicker()}
		title={data.studio.name}
		genres={data.genres}
		services={data.services}
		filter={data.filter}
		visibility={data.visibility}
		works={data.works}
		page={data.page}
		totalPages={data.totalPages}
		total={data.total}
	>
		<nav class="kinds" aria-label={m.studio_kicker()}>
			<a href={path} aria-current={data.kind === 'film' ? 'page' : undefined}>{m.nav_films()}</a>
			<a href="{path}?kind=series" aria-current={data.kind === 'series' ? 'page' : undefined}>
				{m.nav_series()}
			</a>
		</nav>
	</CatalogueBrowse>
{/if}

<style>
	.kinds {
		display: flex;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
	}

	.kinds a {
		padding-bottom: var(--space-1);
		border-bottom: 1px solid transparent;
		color: var(--color-text);
		font-size: var(--font-size-control);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.kinds a:hover {
		color: var(--color-heading);
	}

	.kinds a[aria-current] {
		border-bottom-color: var(--color-accent);
		color: var(--color-heading);
	}
</style>
