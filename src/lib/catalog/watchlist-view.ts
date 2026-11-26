import type { WatchlistItem, WorkKind } from './library';

/** Orders offered for the watchlist; the first is the default. */
export const watchlistSorts = [
	'added',
	'added_oldest',
	'release',
	'release_oldest',
	'name'
] as const;

export type WatchlistSort = (typeof watchlistSorts)[number];

export interface WatchlistOptions {
	kind: WorkKind | null;
	/** First year of the decade the works were released in. */
	decade: number | null;
	genre: string | null;
	/** Identifier of a TMDB watch provider the works must stream on. */
	service: number | null;
	tag: string | null;
	sort: WatchlistSort;
}

/** A watchlist item with the genres and services of its work, when filters loaded them. */
export type WatchlistRow = WatchlistItem & { genres?: string[]; services?: number[] };

export const defaultWatchlistOptions: WatchlistOptions = {
	kind: null,
	decade: null,
	genre: null,
	service: null,
	tag: null,
	sort: 'added'
};

/** Reads the options of the watchlist from its query string, ignoring invalid values. */
export function parseWatchlistOptions(params: URLSearchParams): WatchlistOptions {
	const decade = params.get('decade');
	const service = params.get('service');
	const text = (name: string) => {
		const value = params.get(name)?.trim();
		return value ? value.slice(0, 100) : null;
	};
	const kind = params.get('kind');
	return {
		kind: kind === 'film' || kind === 'series' ? kind : null,
		decade: decade !== null && /^\d{3}0$/.test(decade) ? Number(decade) : null,
		genre: text('genre'),
		service: service !== null && /^\d{1,9}$/.test(service) ? Number(service) : null,
		tag: text('tag'),
		sort: watchlistSorts.find((sort) => sort === params.get('sort')) ?? 'added'
	};
}

/** Query string of the watchlist, leaving out default values. */
export function watchlistQuery(options: WatchlistOptions): string {
	const params = new URLSearchParams();
	if (options.kind !== null) params.set('kind', options.kind);
	if (options.decade !== null) params.set('decade', String(options.decade));
	if (options.genre !== null) params.set('genre', options.genre);
	if (options.service !== null) params.set('service', String(options.service));
	if (options.tag !== null) params.set('tag', options.tag);
	if (options.sort !== 'added') params.set('sort', options.sort);
	return params.toString();
}

function byYear(a: number | null, b: number | null, direction: 1 | -1): number {
	if (a === b) return 0;
	if (a === null) return 1;
	if (b === null) return -1;
	return (a - b) * direction;
}

const sorters: Record<WatchlistSort, (a: WatchlistRow, b: WatchlistRow) => number> = {
	added: (a, b) => b.addedAt.getTime() - a.addedAt.getTime(),
	added_oldest: (a, b) => a.addedAt.getTime() - b.addedAt.getTime(),
	release: (a, b) => byYear(a.work.year, b.work.year, -1),
	release_oldest: (a, b) => byYear(a.work.year, b.work.year, 1),
	name: (a, b) => a.work.title.localeCompare(b.work.title)
};

/** Items matching the options, in their order. */
export function applyWatchlistOptions<T extends WatchlistRow>(
	items: T[],
	options: WatchlistOptions
): T[] {
	return items
		.filter(
			(item) =>
				(options.kind === null || item.work.kind === options.kind) &&
				(options.decade === null ||
					(item.work.year !== null &&
						item.work.year >= options.decade &&
						item.work.year < options.decade + 10)) &&
				(options.genre === null || (item.genres ?? []).includes(options.genre)) &&
				(options.service === null || (item.services ?? []).includes(options.service)) &&
				(options.tag === null || item.tags.includes(options.tag))
		)
		.toSorted(sorters[options.sort]);
}

/** Decades the works were released in, newest first. */
export function watchlistDecades(items: WatchlistItem[]): number[] {
	const decades = items.flatMap((item) =>
		item.work.year === null ? [] : [Math.floor(item.work.year / 10) * 10]
	);
	return [...new Set(decades)].sort((a, b) => b - a);
}
