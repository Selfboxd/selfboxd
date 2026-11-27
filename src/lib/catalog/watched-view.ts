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

/** Ratings from `min` to `max`, both from 1 to 10. */
export interface RatingRange {
	min: number;
	max: number;
}

export interface WatchedOptions {
	/** Range of stored ratings, `none` for works without one, `null` for any. */
	rating: RatingRange | 'none' | null;
	/** First year of the decade the works were released in. */
	decade: number | null;
	/** Year the works were released in. */
	released: number | null;
	genre: string | null;
	/** ISO 3166-1 code of a production country. */
	country: string | null;
	/** ISO 639-1 code of the original language. */
	language: string | null;
	/** Identifier of a TMDB watch provider the works must stream on. */
	service: number | null;
	liked: boolean;
	sort: WatchedSort;
}

/** A watched work, with its genres and services when they were loaded. */
export interface WatchedRow {
	work: { title: string; year: number | null };
	rating: number | null;
	liked: boolean;
	genres?: string[];
	services?: number[];
	countries?: string[];
	language?: string;
}

export const defaultWatchedOptions: WatchedOptions = {
	rating: null,
	decade: null,
	released: null,
	genre: null,
	country: null,
	language: null,
	service: null,
	liked: false,
	sort: 'watched'
};

/** Reads a rating or a range of ratings such as `7` or `5-8`. */
export function parseRatingRange(value: string | null): RatingRange | 'none' | null {
	if (value === 'none') return 'none';
	const match = value === null ? null : /^(10|[1-9])(?:-(10|[1-9]))?$/.exec(value);
	if (!match) return null;
	const first = Number(match[1]);
	const second = match[2] === undefined ? first : Number(match[2]);
	return { min: Math.min(first, second), max: Math.max(first, second) };
}

/** Writes a rating range for a query string. */
export function ratingRangeText(range: RatingRange | 'none'): string {
	if (range === 'none') return 'none';
	return range.min === range.max ? String(range.min) : `${String(range.min)}-${String(range.max)}`;
}

/** Reads the options from a query string, ignoring invalid values. */
export function parseWatchedOptions(params: URLSearchParams): WatchedOptions {
	const rating = params.get('rating');
	const decade = params.get('decade');
	const service = params.get('service');
	const genre = params.get('genre')?.trim();
	const released = params.get('released');
	const country = params.get('country');
	const language = params.get('language');
	return {
		rating: parseRatingRange(rating),
		decade: decade !== null && /^\d{3}0$/.test(decade) ? Number(decade) : null,
		released: released !== null && /^\d{4}$/.test(released) ? Number(released) : null,
		genre: genre ? genre.slice(0, 100) : null,
		country: country !== null && /^[A-Z]{2}$/.test(country) ? country : null,
		language: language !== null && /^[a-z]{2,3}$/.test(language) ? language : null,
		service: service !== null && /^\d{1,9}$/.test(service) ? Number(service) : null,
		liked: params.get('liked') === '1',
		sort: watchedSorts.find((sort) => sort === params.get('sort')) ?? 'watched'
	};
}

/** Query string of the options, leaving out default values. */
export function watchedQuery(options: WatchedOptions): string {
	const params = new URLSearchParams();
	if (options.rating !== null) params.set('rating', ratingRangeText(options.rating));
	if (options.decade !== null) params.set('decade', String(options.decade));
	if (options.released !== null) params.set('released', String(options.released));
	if (options.genre !== null) params.set('genre', options.genre);
	if (options.country !== null) params.set('country', options.country);
	if (options.language !== null) params.set('language', options.language);
	if (options.service !== null) params.set('service', String(options.service));
	if (options.liked) params.set('liked', '1');
	if (options.sort !== 'watched') params.set('sort', options.sort);
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

function inRange(rating: number | null, range: WatchedOptions['rating']): boolean {
	if (range === null) return true;
	if (range === 'none') return rating === null;
	return rating !== null && rating >= range.min && rating <= range.max;
}

/** Works matching the options, in their order; the default order is kept as given. */
export function applyWatchedOptions<T extends WatchedRow>(rows: T[], options: WatchedOptions): T[] {
	const kept = rows.filter(
		(row) =>
			inRange(row.rating, options.rating) &&
			(options.decade === null ||
				(row.work.year !== null &&
					row.work.year >= options.decade &&
					row.work.year < options.decade + 10)) &&
			(options.released === null || row.work.year === options.released) &&
			(options.genre === null || (row.genres ?? []).includes(options.genre)) &&
			(options.country === null || (row.countries ?? []).includes(options.country)) &&
			(options.language === null || row.language === options.language) &&
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
