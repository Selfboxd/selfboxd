<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';

	const tabs = $derived([
		{ href: resolve('/(app)/profile'), label: m.nav_profile() },
		{ href: resolve('/(app)/activity'), label: m.nav_activity() },
		{ href: resolve('/(app)/watched'), label: m.nav_watched() },
		{ href: resolve('/(app)/diary'), label: m.nav_diary() },
		{ href: resolve('/(app)/reviews'), label: m.profile_tab_reviews() },
		{ href: resolve('/(app)/watchlist'), label: m.nav_watchlist() },
		{ href: resolve('/(app)/lists'), label: m.nav_lists() },
		{ href: resolve('/(app)/likes'), label: m.profile_tab_likes() },
		{ href: resolve('/(app)/tags'), label: m.profile_tab_tags() }
	]);
</script>

<nav aria-label={m.nav_profile()}>
	{#each tabs as tab (tab.href)}
		<a href={tab.href} aria-current={page.url.pathname === tab.href ? 'page' : undefined}>
			{tab.label}
		</a>
	{/each}
</nav>

<style>
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		justify-content: center;
		margin-bottom: var(--space-8);
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-medium);
		background: var(--color-background-raised);
	}

	a {
		padding: var(--space-1) 0;
		border-bottom: 1px solid transparent;
		color: var(--color-text);
		font-size: var(--font-size-body);
	}

	a:hover {
		color: var(--color-link-hover);
	}

	a[aria-current] {
		border-color: var(--color-highlight);
		color: var(--color-heading);
	}
</style>
