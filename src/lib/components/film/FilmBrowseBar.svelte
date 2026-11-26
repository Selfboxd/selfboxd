<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		browseDecades,
		browseQuery,
		type BrowseFilter,
		type Genre
	} from '#lib/catalog/browse.js';
	import type { WorkKind } from '#lib/catalog/library.js';
	import Icon from '#lib/components/Icon.svelte';
	import { browseRoute } from '#lib/paths.js';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		genres: Genre[];
		/** What is browsed; films by default. */
		kind?: WorkKind;
		/** The filter in effect, when the bar heads a list of results. */
		filter?: BrowseFilter;
	}

	interface Entry {
		label: string;
		query: string;
		current?: boolean;
	}

	let { genres, kind = 'film', filter }: Props = $props();

	let root: HTMLElement | undefined = $state();
	let suppressed = $state(false);

	const base: Partial<BrowseFilter> = $derived(
		filter
			? { sort: filter.sort, decade: filter.decade, year: filter.year, genre: filter.genre }
			: {}
	);
	const thisYear = new Date().getUTCFullYear();

	const menus: { label: string; entries: Entry[] }[] = $derived([
		{
			label: m.browse_year(),
			entries: [
				{ label: m.browse_all(), query: browseQuery({ ...base, decade: null, year: null }) },
				{ label: m.browse_upcoming(), query: browseQuery({ genre: base.genre, sort: 'upcoming' }) },
				...browseDecades().map((decade) => ({
					label: m.browse_decade({ decade: String(decade) }),
					query: browseQuery({
						...base,
						sort: base.sort === 'upcoming' ? 'popular' : base.sort,
						decade,
						year: null
					}),
					current: filter?.decade === decade && filter.year === null
				}))
			]
		},
		{
			label: m.browse_rating(),
			entries: [
				{
					label: m.browse_highest(),
					query: browseQuery({ ...base, sort: 'rating' }),
					current: filter?.sort === 'rating'
				},
				{
					label: m.browse_lowest(),
					query: browseQuery({ ...base, sort: 'rating_lowest' }),
					current: filter?.sort === 'rating_lowest'
				}
			]
		},
		{
			label: m.browse_popular(),
			entries: [
				{
					label: m.browse_all_time(),
					query: browseQuery({ ...base, sort: 'popular' }),
					current: filter?.sort === 'popular' && filter.year === null
				},
				{
					label: m.browse_this_year(),
					query: browseQuery({ genre: base.genre, sort: 'popular', year: thisYear }),
					current: filter?.sort === 'popular' && filter.year === thisYear
				}
			]
		},
		{
			label: m.browse_genre(),
			entries: [
				{ label: m.browse_all(), query: browseQuery({ ...base, genre: null }) },
				...genres.map((genre) => ({
					label: genre.name,
					query: browseQuery({ ...base, genre: genre.id }),
					current: filter?.genre === genre.id
				}))
			]
		},
		{
			label: m.browse_other(),
			entries: [
				{
					label: m.browse_name(),
					query: browseQuery({ ...base, sort: 'name' }),
					current: filter?.sort === 'name'
				}
			]
		}
	]);

	afterNavigate(() => {
		suppressed = root?.matches(':hover') ?? false;
		if (document.activeElement instanceof HTMLElement && root?.contains(document.activeElement)) {
			document.activeElement.blur();
		}
	});
</script>

<nav aria-label={m.browse_by()}>
	<span class="heading">{m.browse_by()}</span>
	<ul class="menus" class:suppressed bind:this={root} onmouseleave={() => (suppressed = false)}>
		{#each menus as menu (menu.label)}
			<li>
				<span class="sizer" aria-hidden="true">{menu.label} <Icon name="chevron" /></span>
				<div class="menu" role="group">
					<button class="trigger" type="button" aria-haspopup="true">
						{menu.label}
						<Icon name="chevron" />
					</button>
					<ul class="entries">
						{#each menu.entries as entry (entry.label)}
							<li>
								<a
									href="{resolve(browseRoute(kind))}{entry.query ? `?${entry.query}` : ''}"
									aria-current={entry.current ? 'true' : undefined}
								>
									{entry.label}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			</li>
		{/each}
	</ul>
</nav>

<style>
	nav {
		display: flex;
		gap: var(--space-3);
		align-items: center;
	}

	.heading {
		color: var(--color-text);
		font-size: var(--font-size-small);
		line-height: 1;
		letter-spacing: var(--letter-spacing-caps);
		text-transform: uppercase;
	}

	.menus {
		display: flex;
		margin: 0;
		padding: 0;
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-small);
		list-style: none;
	}

	.menus > li {
		position: relative;
		border-inline-start: 1px solid var(--color-border-subtle);
	}

	.menus > li:first-child {
		border: 0;
	}

	.sizer,
	.trigger {
		display: flex;
		gap: var(--space-1);
		align-items: center;
		height: var(--browse-height);
		padding: 0 var(--space-2);
		font-size: var(--font-size-small);
		line-height: 1;
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
		left: 0;
		overflow: hidden;
		min-width: 100%;
		border-radius: var(--radius-small);
	}

	.trigger {
		width: 100%;
		border: 0;
		background: none;
		color: var(--color-text);
		font-family: inherit;
		cursor: pointer;
	}

	.entries {
		display: none;
		overflow-y: auto;
		max-height: 22rem;
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

	.entries a {
		display: block;
		padding: var(--space-1) var(--space-2);
		color: var(--color-menu-text);
		font-size: var(--font-size-control);
		white-space: nowrap;
	}

	.entries a:hover,
	.entries a[aria-current] {
		background: var(--color-menu-hover);
		color: var(--color-heading);
	}

	@media (max-width: 48rem) {
		nav {
			flex-direction: column;
			align-items: flex-start;
		}

		.menus {
			flex-wrap: wrap;
		}
	}
</style>
