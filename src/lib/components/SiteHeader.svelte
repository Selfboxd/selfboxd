<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PublicUser } from '#lib/server/auth/users.js';
	import Avatar from './Avatar.svelte';
	import Icon from './Icon.svelte';
	import LogButton from './library/LogButton.svelte';

	interface Props {
		/** The signed-in account. */
		user: PublicUser;
	}

	let { user }: Props = $props();

	let menu: HTMLDetailsElement | undefined = $state();
	let searchField: HTMLInputElement | undefined = $state();
	let searching = $state(false);

	const links = $derived([
		{ href: resolve('/(app)/watched'), label: m.nav_watched() },
		{ href: resolve('/(app)/diary'), label: m.nav_diary() },
		{ href: resolve('/(app)/journal'), label: m.nav_journal() }
	]);

	function closeMenu() {
		if (menu) menu.open = false;
	}

	function closeOnOutsideClick(event: MouseEvent) {
		if (menu && event.target instanceof Node && !menu.contains(event.target)) closeMenu();
	}

	async function openSearch(event: MouseEvent) {
		event.preventDefault();
		searching = true;
		await tick();
		searchField?.focus();
	}

	function closeSearch() {
		if (searchField?.value === '') searching = false;
	}

	afterNavigate(() => {
		closeMenu();
		searching = false;
	});
</script>

<svelte:window onclick={closeOnOutsideClick} />

<header>
	<nav class="bar" aria-label={m.nav_label()}>
		<div class="links">
			<a
				class="icon-link"
				href={resolve('/(app)/activity')}
				aria-label={m.nav_activity()}
				title={m.nav_activity()}
				aria-current={page.url.pathname === resolve('/(app)/activity') ? 'page' : undefined}
			>
				<Icon name="bolt" filled />
			</a>
			{#each links as link (link.href)}
				<a href={link.href} aria-current={page.url.pathname === link.href ? 'page' : undefined}>
					{link.label}
				</a>
			{/each}
			{#if searching}
				<form class="search" method="GET" action={resolve('/(app)/search')} role="search">
					<input
						type="search"
						name="q"
						aria-label={m.nav_search()}
						autocomplete="off"
						required
						bind:this={searchField}
						onblur={closeSearch}
						onkeydown={(event) => {
							if (event.key === 'Escape') searching = false;
						}}
					/>
					<button aria-label={m.nav_search()}><Icon name="search" /></button>
				</form>
			{:else}
				<a
					class="icon-link"
					href={resolve('/(app)/search')}
					aria-label={m.nav_search()}
					title={m.nav_search()}
					onclick={openSearch}
				>
					<Icon name="search" />
				</a>
			{/if}
			<LogButton scale={user.ratingScale} />
		</div>

		<div class="anchor">
			<details class="account" bind:this={menu}>
				<summary>
					<Avatar {user} />
					<span class="username">{user.username}</span>
					<Icon name="chevron" />
				</summary>
				<div class="menu">
					<a href={resolve('/(app)')}>{m.nav_home()}</a>
					<a href={resolve('/(app)/diary')}>{m.nav_diary()}</a>
					<a href={resolve('/(app)/watchlist')}>{m.nav_watchlist()}</a>
					<a class="divided" href={resolve('/(app)/settings')}>{m.nav_settings()}</a>
					<form method="POST" action={resolve('/(app)/logout')}>
						<button>{m.nav_sign_out()}</button>
					</form>
				</div>
			</details>
		</div>
	</nav>
</header>

<style>
	header {
		position: relative;
		z-index: 2;
		background: var(--color-header);
	}

	:global(.app-root:has(.backdrop)) header {
		background: linear-gradient(var(--color-header-scrim), transparent);
	}

	.bar {
		display: flex;
		gap: var(--space-4);
		align-items: center;
		justify-content: space-between;
		max-width: var(--content-width);
		min-height: var(--header-height);
		margin: 0 auto;
		padding: 0 var(--space-4);
	}

	.links {
		display: flex;
		gap: var(--space-4);
		align-items: center;
	}

	.links > a {
		color: var(--color-nav);
		font-size: var(--font-size-control);
		font-weight: 700;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.links > a:hover,
	.links > a[aria-current] {
		color: var(--color-heading);
	}

	.links > .icon-link {
		display: flex;
		font-size: var(--font-size-large);
	}

	.search {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search input {
		width: var(--search-width);
		height: var(--search-height);
		padding: 0 var(--space-8) 0 var(--space-3);
		border: 0;
		border-radius: var(--search-height);
		background: var(--color-input-focus);
		color: var(--color-input-focus-text);
		font: inherit;
		font-size: var(--font-size-control);
		outline: none;
	}

	.search button {
		position: absolute;
		right: var(--space-2);
		display: flex;
		padding: var(--space-1);
		border: 0;
		background: none;
		color: var(--color-text-muted);
		font-size: var(--font-size-body);
		cursor: pointer;
	}

	.search button:hover {
		color: var(--color-input-focus-text);
	}

	.anchor {
		position: relative;
		width: var(--menu-width);
		height: var(--menu-row-height);
	}

	.account {
		position: absolute;
		z-index: 10;
		top: 0;
		right: 0;
		left: 0;
		overflow: hidden;
		border-radius: var(--radius-small);
	}

	.account[open] {
		background: var(--color-menu);
		box-shadow: var(--shadow-button), var(--shadow-menu);
	}

	summary {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		justify-content: flex-end;
		height: var(--menu-row-height);
		padding: 0 var(--space-3);
		color: var(--color-nav);
		font-size: var(--font-size-control);
		font-weight: 700;
		letter-spacing: var(--letter-spacing-caps);
		list-style: none;
		text-transform: uppercase;
		cursor: pointer;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary:hover,
	.account[open] summary {
		color: var(--color-heading);
	}

	.account[open] summary {
		justify-content: flex-start;
	}

	summary :global(.icon) {
		stroke-width: 2.5;
	}

	.username {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.menu {
		display: flex;
		flex-direction: column;
		padding: var(--space-1) 0;
		border-top: 1px solid var(--color-menu-divider);
	}

	.menu form,
	.menu .divided {
		margin-top: var(--space-1);
		border-top: 1px solid var(--color-menu-divider);
	}

	.menu form {
		padding-top: var(--space-1);
	}

	.menu a,
	.menu button {
		display: block;
		width: 100%;
		padding: var(--space-1) var(--space-3);
		border: 0;
		background: none;
		color: var(--color-menu-text);
		font-family: inherit;
		font-size: var(--font-size-control);
		text-align: start;
		white-space: nowrap;
		cursor: pointer;
	}

	.menu a:hover,
	.menu button:hover {
		background: var(--color-menu-hover);
		color: var(--color-heading);
	}

	@media (max-width: 48rem) {
		.bar {
			flex-wrap: wrap;
			padding-block: var(--space-2);
		}

		.links {
			flex-wrap: wrap;
		}
	}
</style>
