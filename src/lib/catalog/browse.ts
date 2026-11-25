/** Orders offered when browsing films. */
export const browseSorts = ['popular', 'rating', 'rating_lowest', 'name', 'upcoming'] as const;

export type BrowseSort = (typeof browseSorts)[number];

/** How the catalogue of films is narrowed and ordered. */
export interface BrowseFilter {
	sort: BrowseSort;
	/** First year of a decade, such as 1980. */
	decade: number | null;
	/** A single release year. */
	year: number | null;
	/** Identifier of a TMDB genre. */
	genre: number | null;
	page: number;
}

export interface Genre {
	id: number;
	name: string;
}

/** Earliest decade offered. */
export const firstDecade = 1880;

/** Largest page TMDB serves. */
export const browsePageMax = 500;

/** Decades offered when browsing, newest first. */
export function browseDecades(now = new Date()): number[] {
	const current = Math.floor(now.getUTCFullYear() / 10) * 10;
	const decades: number[] = [];
	for (let decade = current; decade >= firstDecade; decade -= 10) decades.push(decade);
	return decades;
}

/** Query string of the browse page for a filter, leaving out its default values. */
export function browseQuery(
	filter: {
		[Key in keyof BrowseFilter]?: BrowseFilter[Key] | undefined;
	} & {
		/** Which works are shown by what the account watched; all of them by default. */
		show?: 'all' | 'unwatched' | 'watched';
	}
): string {
	const params = new URLSearchParams();
	if (filter.sort && filter.sort !== 'popular') params.set('sort', filter.sort);
	if (filter.decade) params.set('decade', String(filter.decade));
	if (filter.year) params.set('year', String(filter.year));
	if (filter.genre) params.set('genre', String(filter.genre));
	if (filter.show && filter.show !== 'all') params.set('show', filter.show);
	if (filter.page && filter.page > 1) params.set('page', String(filter.page));
	return params.toString();
}
