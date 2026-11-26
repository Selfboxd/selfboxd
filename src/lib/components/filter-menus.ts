import type { Snippet } from 'svelte';
import type { IconName } from './Icon.svelte';

/** One choice of a filter menu: the query string it leads to and whether it is in effect. */
export interface FilterEntry {
	label: string;
	query: string;
	current: boolean;
}

export interface FilterMenu {
	/** Text of the trigger, also its accessible name. */
	label: string;
	/** Icon shown instead of the text of the trigger. */
	icon?: IconName;
	entries: FilterEntry[];
	/** Drawn below the entries, such as a range picker. */
	after?: Snippet;
}
