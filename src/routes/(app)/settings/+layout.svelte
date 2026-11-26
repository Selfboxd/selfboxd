<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const tabs = $derived([
		{ href: resolve('/(app)/settings/profile'), label: m.settings_tab_profile() },
		{ href: resolve('/(app)/settings/auth'), label: m.settings_tab_auth() },
		{ href: resolve('/(app)/settings/avatar'), label: m.settings_tab_avatar() },
		{ href: resolve('/(app)/settings/preferences'), label: m.settings_tab_preferences() },
		{ href: resolve('/(app)/settings/streaming'), label: m.settings_tab_streaming() },
		{ href: resolve('/(app)/settings/public'), label: m.settings_tab_public() },
		...(data.user?.isAdmin
			? [
					{ href: resolve('/(app)/settings/accounts'), label: m.settings_tab_accounts() },
					{ href: resolve('/(app)/settings/instance'), label: m.settings_tab_instance() }
				]
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
		color: var(--color-highlight);
		font-size: var(--font-size-control);
		font-weight: 400;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.tabs a:hover {
		color: var(--color-link-hover);
	}

	.tabs a[aria-current='page'] {
		border-bottom-color: var(--color-heading);
		color: var(--color-heading);
	}
</style>
