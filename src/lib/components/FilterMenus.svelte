<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { FilterEntry, FilterMenu } from './filter-menus.js';

	interface Props {
		menus: FilterMenu[];
		/** Draws the link of an entry; the page builds its address with `resolve`. */
		link: Snippet<[FilterEntry]>;
	}

	let { menus, link }: Props = $props();

	let root: HTMLElement | undefined = $state();
	let suppressed = $state(false);

	afterNavigate(() => {
		suppressed = root?.matches(':hover') ?? false;
		if (document.activeElement instanceof HTMLElement && root?.contains(document.activeElement)) {
			document.activeElement.blur();
		}
	});
</script>

{#snippet face(menu: FilterMenu)}
	{#if menu.icon}<Icon name={menu.icon} filled />{:else}{menu.label}{/if}
	<Icon name="chevron" />
{/snippet}

<ul class="menus" class:suppressed bind:this={root} onmouseleave={() => (suppressed = false)}>
	{#each menus as menu (menu.label)}
		<li>
			<span class="sizer" aria-hidden="true">{@render face(menu)}</span>
			<div class="menu" role="group">
				<button class="trigger" type="button" aria-haspopup="true" aria-label={menu.label}>
					{@render face(menu)}
				</button>
				<ul class="entries">
					{#each menu.entries as entry (entry.label)}
						<li>{@render link(entry)}</li>
					{/each}
					{#if menu.after}<li class="after">{@render menu.after()}</li>{/if}
				</ul>
			</div>
		</li>
	{/each}
</ul>

<style>
	.menus {
		display: flex;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.menus > li {
		position: relative;
	}

	.sizer,
	.trigger {
		display: flex;
		gap: var(--space-1);
		align-items: center;
		padding: 2px var(--space-2);
		font-size: var(--font-size-filter);
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
		white-space: nowrap;
	}

	.sizer {
		visibility: hidden;
	}

	.menu {
		position: absolute;
		z-index: 15;
		top: 0;
		right: 0;
		overflow: hidden;
		min-width: 100%;
		border-radius: var(--radius-small);
	}

	.trigger {
		width: 100%;
		justify-content: flex-end;
		border: 0;
		background: none;
		color: var(--color-text-muted);
		font-family: inherit;
		cursor: pointer;
	}

	.trigger:hover {
		color: var(--color-text-strong);
	}

	.entries {
		display: none;
		overflow-y: auto;
		max-height: var(--select-max-height);
		margin: 0;
		padding: var(--space-1) 0;
		border-top: 1px solid var(--color-menu-divider);
		list-style: none;
	}

	.menus:not(.suppressed) .menu:hover,
	.menus:not(.suppressed) .menu:focus-within {
		z-index: 16;
		background: var(--color-menu);
		box-shadow: var(--shadow-button), var(--shadow-menu);
	}

	.menus:not(.suppressed) .menu:hover .trigger,
	.menus:not(.suppressed) .menu:focus-within .trigger {
		color: var(--color-heading);
	}

	.menus:not(.suppressed) .menu:hover .entries,
	.menus:not(.suppressed) .menu:focus-within .entries {
		display: block;
	}

	.entries :global(a) {
		display: block;
		padding: var(--space-1) var(--space-3);
		color: var(--color-menu-text);
		font-size: var(--font-size-control);
		white-space: nowrap;
	}

	.after {
		margin-top: var(--space-1);
		border-top: 1px solid var(--color-menu-divider);
	}

	.entries :global(a:hover),
	.entries :global(a[aria-current]) {
		background: var(--color-menu-hover);
		color: var(--color-heading);
	}
</style>
