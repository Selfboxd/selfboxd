<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import type { PublicUser } from '#lib/server/auth/users.js';
	import Avatar from './Avatar.svelte';
	import SiteLogo from './SiteLogo.svelte';

	interface Props {
		/** The signed-in account. */
		user: PublicUser;
	}

	let { user }: Props = $props();

	let menu: HTMLDetailsElement | undefined = $state();

	function closeMenu() {
		if (menu) menu.open = false;
	}

	function closeOnOutsideClick(event: MouseEvent) {
		if (menu && event.target instanceof Node && !menu.contains(event.target)) closeMenu();
	}

	afterNavigate(closeMenu);
</script>

<svelte:window onclick={closeOnOutsideClick} />

<header>
	<div class="bar">
		<a class="brand" href={resolve('/(app)')}><SiteLogo /></a>
		<nav aria-label={m.nav_label()}>
			<form class="search" method="GET" action={resolve('/(app)/search')} role="search">
				<input type="search" name="q" aria-label={m.nav_search()} autocomplete="off" required />
				<button aria-label={m.nav_search()}>
					<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
						<circle cx="6.8" cy="6.8" r="5.3" />
						<path d="M15 15l-4.2-4.2" />
					</svg>
				</button>
			</form>
			<div class="anchor">
				<details class="account" bind:this={menu}>
					<summary>
						<Avatar {user} />
						<span class="username">{user.username}</span>
						<svg class="chevron" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">
							<path d="M1 1l4 4 4-4" />
						</svg>
					</summary>
					<div class="menu">
						<a href={resolve('/(app)')}>{m.nav_home()}</a>
						<a href={resolve('/(app)/settings')}>{m.nav_settings()}</a>
						<form method="POST" action={resolve('/(app)/logout')}>
							<button>{m.nav_sign_out()}</button>
						</form>
					</div>
				</details>
			</div>
		</nav>
	</div>
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

	.brand {
		display: flex;
	}

	nav {
		display: flex;
		gap: var(--space-4);
		align-items: center;
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
		background: var(--color-input);
		box-shadow: var(--shadow-input);
		color: var(--color-input-text);
		font: inherit;
		font-size: var(--font-size-control);
	}

	.search input:focus {
		background: var(--color-input-focus);
		box-shadow: none;
		color: var(--color-input-focus-text);
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
		cursor: pointer;
	}

	.search button:hover {
		color: var(--color-link-hover);
	}

	.search svg {
		fill: none;
		stroke: currentcolor;
		stroke-linecap: round;
		stroke-width: 1.5;
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
		height: var(--menu-row-height);
		padding: 0 var(--space-3);
		color: var(--color-text-strong);
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

	.username {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chevron {
		flex-shrink: 0;
		fill: none;
		stroke: currentcolor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2;
	}

	.menu {
		display: flex;
		flex-direction: column;
		padding: var(--space-1) 0;
		border-top: 1px solid var(--color-menu-divider);
	}

	.menu form {
		margin-top: var(--space-1);
		padding-top: var(--space-1);
		border-top: 1px solid var(--color-menu-divider);
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
</style>
