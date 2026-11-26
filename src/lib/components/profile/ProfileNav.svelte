<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Avatar from '#lib/components/Avatar.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PublicUser } from '#lib/server/auth/users.js';

	const user = $derived(page.data.user as PublicUser | null | undefined);
	const profile = resolve('/(app)/profile');
	const onProfile = $derived(page.url.pathname === profile);
	const tabs = $derived([
		{ href: resolve('/(app)/activity'), label: m.nav_activity() },
		{ href: resolve('/(app)/watched'), label: m.nav_films() },
		{ href: resolve('/(app)/watched/series'), label: m.nav_series() },
		{ href: resolve('/(app)/diary'), label: m.nav_diary() },
		{ href: resolve('/(app)/reviews'), label: m.profile_tab_reviews() },
		{ href: resolve('/(app)/watchlist'), label: m.nav_watchlist() },
		{ href: resolve('/(app)/profile/lists'), label: m.nav_lists() },
		{ href: resolve('/(app)/likes'), label: m.profile_tab_likes() },
		{ href: resolve('/(app)/tags'), label: m.profile_tab_tags() },
		{ href: resolve('/(app)/stats'), label: m.profile_tab_stats() }
	]);

	/** Whether a tab is the open page, a sub-page counting for its tab unless it has its own. */
	function current(href: string): boolean {
		const path = page.url.pathname;
		if (path === href) return true;
		return (
			path.startsWith(`${href}/`) &&
			!tabs.some((tab) => tab.href !== href && path.startsWith(tab.href))
		);
	}
</script>

<nav class:filled={!onProfile} aria-label={m.nav_profile()}>
	{#if !onProfile && user}
		<a class="owner" href={profile}>
			<Avatar {user} />
			<span>{user.username}</span>
		</a>
	{/if}
	<div class="tabs">
		{#if onProfile}
			<a href={profile} aria-current="page">{m.nav_profile()}</a>
		{/if}
		{#each tabs as tab (tab.href)}
			<a href={tab.href} aria-current={current(tab.href) ? 'page' : undefined}>
				{tab.label}
			</a>
		{/each}
	</div>
</nav>

<style>
	nav {
		position: relative;
		display: flex;
		align-items: stretch;
		justify-content: center;
		min-height: var(--profile-bar-height);
		margin-bottom: var(--space-8);
		padding: 0 var(--space-4);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-medium);
	}

	.filled {
		border-color: transparent;
		background: var(--color-profile-bar);
	}

	.owner {
		position: absolute;
		top: 0;
		bottom: 0;
		left: var(--space-3);
		display: flex;
		gap: var(--space-2);
		align-items: center;
		color: var(--color-heading);
		font-weight: 700;
	}

	.owner:hover {
		color: var(--color-link-hover);
	}

	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0 var(--space-4);
		justify-content: center;
	}

	.tabs a {
		display: flex;
		align-items: center;
		margin-bottom: -1px;
		border-bottom: 1px solid transparent;
		color: var(--color-text);
		font-size: var(--font-size-body);
		transition: color var(--duration-fast);
	}

	.tabs a:hover {
		color: var(--color-link-hover);
	}

	.tabs a[aria-current] {
		border-color: var(--color-highlight);
		color: var(--color-heading);
	}

	@media (max-width: 48rem) {
		nav {
			flex-direction: column;
			padding: var(--space-2) var(--space-3);
		}

		.owner {
			position: static;
			margin-bottom: var(--space-2);
		}

		.tabs a {
			padding: var(--space-1) 0;
		}
	}
</style>
