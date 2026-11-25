<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import type { PublicUser } from '#lib/server/auth/users.js';
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
			<details class="account" bind:this={menu}>
				<summary>
					<span>{user.username}</span>
					<svg class="chevron" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">
						<path d="M1 1l4 4 4-4" />
					</svg>
				</summary>
				<div class="menu">
					<a href={resolve('/(app)/settings')}>{m.nav_settings()}</a>
					<form method="POST" action={resolve('/(app)/logout')}>
						<button>{m.nav_sign_out()}</button>
					</form>
				</div>
			</details>
		</nav>
	</div>
</header>

<style>
	header {
		background: var(--color-header);
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

	.account {
		position: relative;
	}

	summary {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-small);
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

	summary:hover {
		color: var(--color-heading);
	}

	.chevron {
		fill: none;
		stroke: currentcolor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.5;
	}

	.account[open] summary {
		border-radius: var(--radius-small) var(--radius-small) 0 0;
		background: var(--color-menu);
		color: var(--color-menu-text);
	}

	.menu {
		position: absolute;
		z-index: 10;
		top: 100%;
		right: 0;
		display: flex;
		min-width: 100%;
		flex-direction: column;
		padding: var(--space-1) 0;
		border-radius: var(--radius-small) 0 var(--radius-small) var(--radius-small);
		background: var(--color-menu);
		box-shadow: var(--shadow-menu);
	}

	.menu a,
	.menu button {
		display: block;
		width: 100%;
		padding: var(--space-2) var(--space-3);
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
