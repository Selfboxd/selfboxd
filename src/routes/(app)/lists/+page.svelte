<script lang="ts">
	import { resolve } from '$app/paths';
	import FormError from '#lib/components/FormError.svelte';
	import SetupNotice from '#lib/components/SetupNotice.svelte';
	import PublicListCard from '#lib/components/library/PublicListCard.svelte';
	import { chartName } from '#lib/i18n/charts.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const id = $props.id();
	const lists = $derived(data.lists);
</script>

<svelte:head>
	<title>{m.nav_lists()} - Selfboxd</title>
</svelte:head>

<header class="hero">
	<h1>{m.catalogue_lists_hero()}</h1>
	<a class="button button-secondary" href={resolve('/(app)/profile/lists/new')}>
		{m.catalogue_lists_start()}
	</a>
</header>

{#if lists.state === 'not_configured'}
	<SetupNotice
		isAdmin={data.user?.isAdmin ?? false}
		message={data.user?.isAdmin
			? m.mdblist_not_configured_admin()
			: m.mdblist_not_configured_user()}
	/>
{:else if lists.state === 'error'}
	<FormError
		message={lists.error === 'unauthorized'
			? m.error_mdblist_key_invalid()
			: m.catalogue_lists_unavailable()}
	/>
{:else}
	{#if lists.featured.length > 0}
		<section aria-labelledby="{id}-featured">
			<h2 class="section-title" id="{id}-featured">{m.catalogue_lists_featured()}</h2>
			<div class="grid featured">
				{#each lists.featured as list (list.id)}
					<PublicListCard {list} target={{ list: list.id }} />
				{/each}
			</div>
		</section>
	{/if}
	{#if lists.popular.length > 0}
		<section aria-labelledby="{id}-popular">
			<h2 class="section-title" id="{id}-popular">{m.catalogue_lists_popular()}</h2>
			<div class="grid rows">
				{#each lists.popular as list (list.id)}
					<PublicListCard {list} target={{ list: list.id }} row />
				{/each}
			</div>
		</section>
	{/if}
{/if}

{#if data.official.length > 0}
	<section aria-labelledby="{id}-official">
		<h2 class="section-title" id="{id}-official">{m.catalogue_lists_official()}</h2>
		<div class="grid official">
			{#each data.official as { chart, preview } (chart)}
				<PublicListCard
					list={{ name: chartName(chart), owner: 'TMDB', itemCount: null, likes: null, preview }}
					target={{ chart }}
				/>
			{/each}
		</div>
	</section>
{/if}

{#if lists.state === 'ready'}<p class="credit">{m.catalogue_lists_credit()}</p>{/if}

<style>
	.hero {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		align-items: center;
		margin: var(--space-4) 0 var(--space-12);
		text-align: center;
	}

	h1 {
		max-width: 40rem;
		color: var(--color-text);
		font-size: var(--font-size-title);
		font-style: italic;
		line-height: 1.3;
	}

	section {
		margin-bottom: var(--space-12);
	}

	.grid {
		display: grid;
		gap: var(--space-8) var(--space-6);
	}

	.featured {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.rows {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-4) var(--space-8);
	}

	.official {
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--space-4);
	}

	.credit {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	@media (max-width: 48rem) {
		.featured,
		.rows {
			grid-template-columns: minmax(0, 1fr);
		}

		.official {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
