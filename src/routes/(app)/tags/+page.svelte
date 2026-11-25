<script lang="ts">
	import { resolve } from '$app/paths';
	import ProfileNav from '#lib/components/profile/ProfileNav.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function tagQuery(name: string): string {
		return new URLSearchParams({ tag: name }).toString();
	}
</script>

<svelte:head>
	<title>{m.profile_tab_tags()} - Selfboxd</title>
</svelte:head>

<ProfileNav />

<h1 class="section-title">{m.profile_tab_tags()}</h1>

{#if data.tags.length === 0}
	<p>{m.tags_empty()}</p>
{:else}
	<ul>
		{#each data.tags as tag (tag.name)}
			<li>
				<a href="{resolve('/(app)/diary')}?{tagQuery(tag.name)}">{tag.name}</a>
				<span>{tag.count}</span>
			</li>
		{/each}
	</ul>
{/if}

<style>
	ul {
		max-width: 24rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-1) 0;
	}

	a {
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-small);
		background: var(--color-chip);
		box-shadow: var(--shadow-chip);
		color: var(--color-text);
		font-size: var(--font-size-control);
	}

	a:hover {
		background: var(--color-chip-hover);
		color: var(--color-heading);
	}

	span {
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
	}
</style>
