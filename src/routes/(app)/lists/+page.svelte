<script lang="ts">
	import { resolve } from '$app/paths';
	import FormError from '#lib/components/FormError.svelte';
	import PublicListCard from '#lib/components/library/PublicListCard.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const id = $props.id();
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

{#if data.state === 'not_configured'}
	<p class="form-message notice" role="status">
		{data.user?.isAdmin ? m.mdblist_not_configured_admin() : m.mdblist_not_configured_user()}
		{#if data.user?.isAdmin}
			<a href={resolve('/(app)/settings/instance')}>{m.tmdb_open_settings()}</a>
		{/if}
	</p>
{:else}
	<section>
		<h2 class="section-title split-title">
			<span>
				{data.query
					? m.catalogue_lists_matches({ query: data.query })
					: m.catalogue_lists_popular()}
			</span>
			<form class="find" method="GET" role="search">
				<label for="{id}-find">{m.catalogue_lists_find()}</label>
				<input id="{id}-find" type="search" name="q" value={data.query} autocomplete="off" />
			</form>
		</h2>

		{#if data.state === 'error'}
			<FormError
				message={data.error === 'unauthorized'
					? m.error_mdblist_key_invalid()
					: m.catalogue_lists_unavailable()}
			/>
		{:else if data.lists.length === 0}
			<p>{m.catalogue_lists_empty()}</p>
		{:else}
			<div class="grid">
				{#each data.lists as list (list.id)}
					<PublicListCard {list} />
				{/each}
			</div>
		{/if}
	</section>
	<p class="credit">{m.catalogue_lists_credit()}</p>
{/if}

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

	.notice {
		background: var(--color-panel);
		color: var(--color-text-strong);
	}

	.notice a {
		margin-inline-start: var(--space-2);
		text-decoration: underline;
	}

	.split-title {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: baseline;
		justify-content: space-between;
	}

	.find {
		display: flex;
		gap: var(--space-2);
		align-items: baseline;
	}

	.find input {
		width: 12rem;
		padding: var(--space-1) var(--space-2);
		border: 0;
		border-radius: var(--radius-small);
		background: var(--color-input);
		box-shadow: var(--shadow-input);
		color: var(--color-input-text);
		font: inherit;
		font-size: var(--font-size-control);
		letter-spacing: 0;
		text-transform: none;
	}

	.find input:focus {
		background: var(--color-input-focus);
		box-shadow: none;
		color: var(--color-input-focus-text);
		outline: none;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-8) var(--space-6);
	}

	.credit {
		margin-top: var(--space-12);
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}

	@media (max-width: 48rem) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
