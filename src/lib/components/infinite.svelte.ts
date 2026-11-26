import { preloadData } from '$app/navigation';
import { page } from '$app/state';

/** One page of items as a page load returns it. */
export interface PageSlice<T> {
	items: T[];
	page: number;
	more: boolean;
}

/**
 * Items of a paged page load, grown one page at a time without leaving the page.
 * The next page is loaded through the page load itself, with `page` added to the query.
 */
export class InfinitePages<T> {
	items = $state<T[]>([]);
	more = $state(false);
	loading = $state(false);
	#page = 1;

	/**
	 * @param read the slice of the current page data; reading it again resets the items
	 * @param slice the slice of the data loaded for a following page
	 * @param key identity of an item, to skip one already shown
	 */
	constructor(
		read: () => PageSlice<T>,
		private readonly slice: (data: Record<string, unknown>) => PageSlice<T> | null,
		private readonly key: (item: T) => string
	) {
		$effect.pre(() => {
			const current = read();
			this.items = current.items;
			this.more = current.more;
			this.#page = current.page;
			this.loading = false;
		});
	}

	/** Loads and appends the next page, once at a time. */
	async next(): Promise<void> {
		if (this.loading || !this.more) return;
		this.loading = true;
		const query = [...page.url.searchParams]
			.filter(([name]) => name !== 'page')
			.concat([['page', String(this.#page + 1)]])
			.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
			.join('&');
		const origin = page.url.href;
		try {
			const result = await preloadData(`${page.url.pathname}?${query}`);
			if (page.url.href !== origin) return;
			const loaded =
				result.type === 'loaded' && result.status === 200
					? this.slice(result.data as Record<string, unknown>)
					: null;
			if (!loaded) {
				this.more = false;
				return;
			}
			const known = this.items.map(this.key);
			this.items = [
				...this.items,
				...loaded.items.filter((item) => !known.includes(this.key(item)))
			];
			this.#page = loaded.page;
			this.more = loaded.more;
		} catch {
			this.more = false;
		} finally {
			this.loading = false;
		}
	}
}
