<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const tabs = $derived([
		{ href: resolve('/(app)/settings/auth'), label: m.settings_tab_auth() },
		...(data.user?.isAdmin
			? [{ href: resolve('/(app)/settings/accounts'), label: m.settings_tab_accounts() }]
			: [])
	]);
</script>

<h1 class="page-title">{m.settings_title()}</h1>

<nav class="tabs" aria-label={m.settings_title()}>
	{#each tabs as tab (tab.href)}
		<a href={tab.href} aria-current={page.url.pathname === tab.href ? 'page' : undefined}>
			{tab.label}
		</a>
	{/each}
</nav>

{@render children()}

<style>
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		margin-bottom: var(--space-8);
		border-bottom: 1px solid var(--color-border);
	}

	.tabs a {
		margin-bottom: -1px;
		padding: var(--space-2) 0;
		border-bottom: 1px solid transparent;
		color: var(--color-accent);
		font-size: var(--font-size-small);
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.tabs a:hover {
		color: var(--color-link);
		text-decoration: none;
	}

	.tabs a[aria-current='page'] {
		border-bottom-color: var(--color-heading);
		color: var(--color-heading);
	}
</style>
