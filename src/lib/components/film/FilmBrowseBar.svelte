<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		browseDecades,
		browseQuery,
		type BrowseFilter,
		type Genre
	} from '#lib/catalog/browse.js';
	import Icon from '#lib/components/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		genres: Genre[];
		/** The filter in effect, when the bar heads a list of results. */
		filter?: BrowseFilter;
	}

	interface Entry {
		label: string;
		query: string;
		current?: boolean;
	}

	let { genres, filter }: Props = $props();

	let root: HTMLElement | undefined = $state();

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

	function closeAll(except?: EventTarget | null) {
		for (const menu of root?.querySelectorAll('details') ?? []) {
			if (menu !== except) menu.open = false;
		}
	}

	function closeOnOutsideClick(event: MouseEvent) {
		if (root && event.target instanceof Node && !root.contains(event.target)) closeAll();
	}

	afterNavigate(() => {
		closeAll();
	});
</script>

<svelte:window onclick={closeOnOutsideClick} />

<nav aria-label={m.browse_by()} bind:this={root}>
	<span class="heading">{m.browse_by()}</span>
	<ul class="menus">
		{#each menus as menu (menu.label)}
			<li>
				<details
					ontoggle={(event) => {
						if (event.currentTarget.open) closeAll(event.currentTarget);
					}}
				>
					<summary>{menu.label} <Icon name="chevron" /></summary>
					<ul class="entries">
						{#each menu.entries as entry (entry.label)}
							<li>
								<a
									href="{resolve('/(app)/films/browse')}{entry.query ? `?${entry.query}` : ''}"
									aria-current={entry.current ? 'true' : undefined}
								>
									{entry.label}
								</a>
							</li>
						{/each}
					</ul>
				</details>
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
		font-size: var(--font-size-control);
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

	summary {
		display: flex;
		gap: var(--space-1);
		align-items: center;
		padding: var(--space-1) var(--space-2);
		color: var(--color-text);
		font-size: var(--font-size-small);
		letter-spacing: var(--letter-spacing-caps);
		list-style: none;
		text-transform: uppercase;
		cursor: pointer;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary:hover,
	details[open] summary {
		color: var(--color-heading);
	}

	details[open] summary {
		border-radius: var(--radius-small) var(--radius-small) 0 0;
		background: var(--color-menu);
		color: var(--color-menu-text);
	}

	.entries {
		position: absolute;
		z-index: 15;
		top: 100%;
		left: 0;
		overflow-y: auto;
		min-width: 100%;
		max-height: 22rem;
		margin: 0;
		padding: var(--space-1) 0;
		border-radius: 0 var(--radius-small) var(--radius-small) var(--radius-small);
		background: var(--color-menu);
		box-shadow: var(--shadow-menu);
		list-style: none;
	}

	.entries a {
		display: block;
		padding: var(--space-1) var(--space-3);
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
