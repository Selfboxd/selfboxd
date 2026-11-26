/** Orders offered for the watched films and series; the first is the default. */
export const watchedSorts = [
	'watched',
	'release',
	'release_oldest',
	'rating',
	'rating_lowest',
	'name'
] as const;

export type WatchedSort = (typeof watchedSorts)[number];

export const posterSizes = ['small', 'large'] as const;

export type PosterSize = (typeof posterSizes)[number];

export interface WatchedOptions {
	/** Stored rating from 1 to 10, `none` for works without one, `null` for any. */
	rating: number | 'none' | null;
	/** First year of the decade the works were released in. */
	decade: number | null;
	genre: string | null;
	/** Identifier of a TMDB watch provider the works must stream on. */
	service: number | null;
	liked: boolean;
	sort: WatchedSort;
	size: PosterSize;
}

/** A watched work, with its genres and services when they were loaded. */
export interface WatchedRow {
	work: { title: string; year: number | null };
	rating: number | null;
	liked: boolean;
	genres?: string[];
	services?: number[];
}

export const defaultWatchedOptions: WatchedOptions = {
	rating: null,
	decade: null,
	genre: null,
	service: null,
	liked: false,
	sort: 'watched',
	size: 'small'
};

/** Reads the options from a query string, ignoring invalid values. */
export function parseWatchedOptions(params: URLSearchParams): WatchedOptions {
	const rating = params.get('rating');
	const decade = params.get('decade');
	const service = params.get('service');
	const genre = params.get('genre')?.trim();
	return {
		rating:
			rating === 'none'
				? 'none'
				: rating !== null && /^(10|[1-9])$/.test(rating)
					? Number(rating)
					: null,
		decade: decade !== null && /^\d{3}0$/.test(decade) ? Number(decade) : null,
		genre: genre ? genre.slice(0, 100) : null,
		service: service !== null && /^\d{1,9}$/.test(service) ? Number(service) : null,
		liked: params.get('liked') === '1',
		sort: watchedSorts.find((sort) => sort === params.get('sort')) ?? 'watched',
		size: posterSizes.find((size) => size === params.get('size')) ?? 'small'
	};
}

/** Query string of the options, leaving out default values. */
export function watchedQuery(options: WatchedOptions): string {
	const params = new URLSearchParams();
	if (options.rating !== null) params.set('rating', String(options.rating));
	if (options.decade !== null) params.set('decade', String(options.decade));
	if (options.genre !== null) params.set('genre', options.genre);
	if (options.service !== null) params.set('service', String(options.service));
	if (options.liked) params.set('liked', '1');
	if (options.sort !== 'watched') params.set('sort', options.sort);
	if (options.size !== 'small') params.set('size', options.size);
	return params.toString();
}

function byNumber(a: number | null, b: number | null, direction: 1 | -1): number {
	if (a === b) return 0;
	if (a === null) return 1;
	if (b === null) return -1;
	return (a - b) * direction;
}

const sorters: Record<WatchedSort, ((a: WatchedRow, b: WatchedRow) => number) | null> = {
	watched: null,
	release: (a, b) => byNumber(a.work.year, b.work.year, -1),
	release_oldest: (a, b) => byNumber(a.work.year, b.work.year, 1),
	rating: (a, b) => byNumber(a.rating, b.rating, -1),
	rating_lowest: (a, b) => byNumber(a.rating, b.rating, 1),
	name: (a, b) => a.work.title.localeCompare(b.work.title)
};

/** Works matching the options, in their order; the default order is kept as given. */
export function applyWatchedOptions<T extends WatchedRow>(rows: T[], options: WatchedOptions): T[] {
	const kept = rows.filter(
		(row) =>
			(options.rating === null ||
				(options.rating === 'none' ? row.rating === null : row.rating === options.rating)) &&
			(options.decade === null ||
				(row.work.year !== null &&
					row.work.year >= options.decade &&
					row.work.year < options.decade + 10)) &&
			(options.genre === null || (row.genres ?? []).includes(options.genre)) &&
			(options.service === null || (row.services ?? []).includes(options.service)) &&
			(!options.liked || row.liked)
	);
	const sorter = sorters[options.sort];
	return sorter ? kept.toSorted(sorter) : kept;
}

/** Decades the works were released in, newest first. */
export function watchedDecades(rows: WatchedRow[]): number[] {
	const decades = rows.flatMap((row) =>
		row.work.year === null ? [] : [Math.floor(row.work.year / 10) * 10]
	);
	return [...new Set(decades)].sort((a, b) => b - a);
}
