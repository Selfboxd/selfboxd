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

	let searchField: HTMLInputElement | undefined = $state();
	let searching = $state(false);
	let menuSuppressed = $state(false);
	let account: HTMLElement | undefined = $state();

	const home = resolve('/(app)');
	const links = $derived([
		{ href: resolve('/(app)/films'), label: m.nav_films() },
		{ href: resolve('/(app)/lists'), label: m.nav_lists() },
		{ href: resolve('/(app)/diary'), label: m.nav_diary() },
		{ href: resolve('/(app)/journal'), label: m.nav_journal() }
	]);

	function current(active: boolean): 'page' | undefined {
		return active ? 'page' : undefined;
	}

	async function openSearch(event: MouseEvent) {
		event.preventDefault();
		searching = true;
		await tick();
		searchField?.focus();
	}

	function closeSearch() {
		searching = false;
		if (searchField) searchField.value = '';
	}

	afterNavigate(() => {
		closeSearch();
		if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
		menuSuppressed = account?.matches(':hover') ?? false;
	});
</script>

<header>
	<nav class="bar" aria-label={m.nav_label()}>
		<div class="links">
			<a href={home} aria-current={current(page.url.pathname === home)}>{m.nav_home()}</a>
			{#each links as link (link.href)}
				<a href={link.href} aria-current={current(page.url.pathname.startsWith(link.href))}>
					{link.label}
				</a>
			{/each}
			<a
				class="icon-link"
				href={resolve('/(app)/activity')}
				aria-label={m.nav_activity()}
				title={m.nav_activity()}
				aria-current={current(page.url.pathname === resolve('/(app)/activity'))}
			>
				<Icon name="bolt" filled />
			</a>

			<div class="anchor">
				<div
					class="account"
					class:suppressed={menuSuppressed}
					role="group"
					bind:this={account}
					onmouseleave={() => (menuSuppressed = false)}
				>
					<button class="trigger" type="button" aria-haspopup="true">
						<Avatar {user} />
						<span class="username">{user.username}</span>
						<Icon name="chevron" />
					</button>
					<div class="menu">
						<a href={resolve('/(app)/profile')}>{m.nav_profile()}</a>
						<a href={resolve('/(app)/watchlist')}>{m.nav_watchlist()}</a>
						<a href={resolve('/(app)/settings')}>{m.nav_settings()}</a>
						<form method="POST" action={resolve('/(app)/logout')}>
							<button>{m.nav_sign_out()}</button>
						</form>
					</div>
				</div>
			</div>
		</div>

		<div class="tools" class:searching>
			<form
				class="search"
				method="GET"
				action={resolve('/(app)/search')}
				role="search"
				inert={!searching}
			>
				<button class="close" type="button" aria-label={m.dialog_close()} onclick={closeSearch}>
					<Icon name="close" />
				</button>
				<span class="pill">
					<input
						type="search"
						name="q"
						aria-label={m.nav_search()}
						autocomplete="off"
						required
						bind:this={searchField}
						onkeydown={(event) => {
							if (event.key === 'Escape') closeSearch();
						}}
					/>
					<button aria-label={m.nav_search()}><Icon name="search" /></button>
				</span>
			</form>
			<a
				class="icon-link toggle"
				href={resolve('/(app)/search')}
				aria-label={m.nav_search()}
				title={m.nav_search()}
				onclick={openSearch}
			>
				<Icon name="search" />
			</a>
			<div class="log"><LogButton scale={user.ratingScale} /></div>
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
		background: none;
	}

	:global(.app-root:has(.backdrop)) header::before {
		position: absolute;
		z-index: -1;
		height: var(--header-scrim-height);
		background: linear-gradient(var(--color-header-scrim), transparent);
		content: '';
		inset: 0 0 auto;
		pointer-events: none;
	}

	:global(.app-root:has(.backdrop)) .links > a,
	:global(.app-root:has(.backdrop)) .trigger {
		color: var(--color-text-strong);
		text-shadow: var(--shadow-header-text);
	}

	:global(.app-root:has(.backdrop)) .icon-link,
	:global(.app-root:has(.backdrop)) .account:not(:hover, :focus-within) .trigger :global(.icon) {
		color: var(--color-text-strong);
		filter: var(--shadow-header-icon);
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

	.links,
	.tools {
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
		transition: color var(--duration-fast);
	}

	.links > a:hover,
	.links > a[aria-current],
	:global(.app-root:has(.backdrop)) .links > a:hover {
		color: var(--color-heading);
	}

	.icon-link {
		display: flex;
		color: var(--color-nav);
		font-size: var(--font-size-large);
	}

	.icon-link:hover {
		color: var(--color-heading);
	}

	.toggle :global(.icon) {
		stroke-width: 2.5;
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

	.account:not(.suppressed):hover,
	.account:not(.suppressed):focus-within {
		background: var(--color-menu);
		box-shadow: var(--shadow-button), var(--shadow-menu);
	}

	.trigger {
		display: flex;
		width: 100%;
		gap: var(--space-2);
		align-items: center;
		height: var(--menu-row-height);
		padding: 0 var(--space-3);
		border: 0;
		background: none;
		color: var(--color-nav);
		font-family: inherit;
		font-size: var(--font-size-control);
		font-weight: 700;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
		cursor: pointer;
	}

	.account:not(.suppressed):hover .trigger,
	.account:not(.suppressed):focus-within .trigger {
		color: var(--color-heading);
		text-shadow: none;
	}

	.trigger :global(.icon) {
		stroke-width: 2.5;
	}

	.username {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.menu {
		display: none;
		flex-direction: column;
		padding: var(--space-1) 0;
		border-top: 1px solid var(--color-menu-divider);
	}

	.account:not(.suppressed):hover .menu,
	.account:not(.suppressed):focus-within .menu {
		display: flex;
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

	.search {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		overflow: hidden;
		width: 0;
		margin-inline-end: calc(-1 * var(--space-4));
		opacity: 0;
		visibility: hidden;
		transition:
			width var(--duration-fast) ease-out,
			opacity var(--duration-fast) ease-out,
			visibility 0s var(--duration-fast);
	}

	.searching .search {
		width: var(--search-open-width);
		margin-inline-end: 0;
		opacity: 1;
		visibility: visible;
		transition:
			width var(--duration-fast) ease-out,
			opacity var(--duration-fast) ease-out;
	}

	.searching .toggle,
	.searching .log {
		display: none;
	}

	.close {
		display: flex;
		flex-shrink: 0;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-nav);
		font-size: var(--font-size-heading);
		cursor: pointer;
	}

	.close:hover {
		color: var(--color-heading);
	}

	.pill {
		position: relative;
		display: flex;
		flex: 1;
		align-items: center;
	}

	.pill input {
		width: 100%;
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

	.pill button {
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

	.pill button:hover {
		color: var(--color-input-focus-text);
	}

	@media (max-width: 56rem) {
		.bar {
			flex-wrap: wrap;
			padding-block: var(--space-2);
		}

		.links {
			flex-wrap: wrap;
		}
	}
</style>
