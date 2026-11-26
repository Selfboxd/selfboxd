import type { Chart } from './charts';
import type { FilmSummary } from './film';
import type { WorkKind } from './library';

/** Orders offered for the films of a list. */
export const listSorts = ['list', 'reverse', 'name', 'newest', 'oldest', 'rating'] as const;

export type ListSort = (typeof listSorts)[number];

/** Which films of a list are shown, by what the account has watched. */
export const listVisibilities = ['all', 'unwatched', 'watched'] as const;

export type ListVisibility = (typeof listVisibilities)[number];

/** How the films of a list are laid out: posters or rows. */
export const listModes = ['grid', 'detail'] as const;

export type ListMode = (typeof listModes)[number];

/** How a list is narrowed, ordered and laid out. */
export interface ListOptions {
	sort: ListSort;
	/** First year of a decade, such as 1980. */
	decade: number | null;
	/** Name of a genre, as TMDB gives it in the language of the interface. */
	genre: string | null;
	/** Identifier of a TMDB watch provider the works must stream on. */
	service: number | null;
	visibility: ListVisibility;
	mode: ListMode;
}

export const defaultListOptions: ListOptions = {
	sort: 'list',
	decade: null,
	genre: null,
	service: null,
	visibility: 'all',
	mode: 'grid'
};

/** Longest genre name accepted in a query string. */
const genreMaxLength = 60;

/** Reads the options of a list from its query string, ignoring invalid values. */
export function parseListOptions(params: URLSearchParams): ListOptions {
	const decade = params.get('decade');
	const genre = params.get('genre')?.trim() ?? '';
	const service = params.get('service');
	return {
		sort: listSorts.find((name) => name === params.get('sort')) ?? 'list',
		decade: decade !== null && /^\d{3}0$/.test(decade) ? Number(decade) : null,
		genre: genre !== '' && genre.length <= genreMaxLength ? genre : null,
		service: service !== null && /^\d{1,9}$/.test(service) ? Number(service) : null,
		visibility: listVisibilities.find((name) => name === params.get('show')) ?? 'all',
		mode: listModes.find((name) => name === params.get('view')) ?? 'grid'
	};
}

/** Whether the options narrow or reorder the list, which needs every film at once. */
export function isRefined(options: ListOptions): boolean {
	return (
		options.sort !== 'list' ||
		options.decade !== null ||
		options.genre !== null ||
		options.service !== null ||
		options.visibility !== 'all'
	);
}

/** Query string of a list for its options, leaving out the default values. */
export function listOptionsQuery(options: Partial<ListOptions>): string {
	const params = new URLSearchParams();
	if (options.sort && options.sort !== 'list') params.set('sort', options.sort);
	if (options.decade) params.set('decade', String(options.decade));
	if (options.genre) params.set('genre', options.genre);
	if (options.service) params.set('service', String(options.service));
	if (options.visibility && options.visibility !== 'all') params.set('show', options.visibility);
	if (options.mode && options.mode !== 'grid') params.set('view', options.mode);
	return params.toString();
}

/** One film or series of a list, with what the account did with it. */
export interface ListEntry {
	film: Pick<FilmSummary, 'title' | 'year' | 'posterPath'> & {
		id: number | string;
		kind?: WorkKind;
	};
	/** Place in the list, from 1. */
	position: number;
	note: string;
	watched: boolean;
	/** Rating given by the account, from 1 to 10. */
	rating: number | null;
	/** Genres of the work, when they were loaded. */
	genres?: string[];
	/** Watch providers streaming the work, when they were loaded. */
	services?: number[];
}

function compareYears(a: ListEntry, b: ListEntry, direction: 1 | -1): number {
	if (a.film.year === b.film.year) return a.position - b.position;
	if (a.film.year === null) return 1;
	if (b.film.year === null) return -1;
	return (a.film.year - b.film.year) * direction;
}

/** Narrows and orders the entries of a list. Ties keep the order of the list. */
export function applyListOptions(entries: ListEntry[], options: ListOptions): ListEntry[] {
	const { decade, genre, service, visibility } = options;
	const kept = entries.filter(
		(entry) =>
			(decade === null ||
				(entry.film.year !== null && entry.film.year >= decade && entry.film.year < decade + 10)) &&
			(genre === null || (entry.genres ?? []).includes(genre)) &&
			(service === null || (entry.services ?? []).includes(service)) &&
			(visibility === 'all' || entry.watched === (visibility === 'watched'))
	);
	const byPosition = (a: ListEntry, b: ListEntry) => a.position - b.position;
	switch (options.sort) {
		case 'list':
			return kept.toSorted(byPosition);
		case 'reverse':
			return kept.toSorted((a, b) => b.position - a.position);
		case 'name':
			return kept.toSorted((a, b) => a.film.title.localeCompare(b.film.title) || byPosition(a, b));
		case 'newest':
			return kept.toSorted((a, b) => compareYears(a, b, -1));
		case 'oldest':
			return kept.toSorted((a, b) => compareYears(a, b, 1));
		case 'rating':
			return kept.toSorted((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || byPosition(a, b));
	}
}

/** Decades of the works of a list, newest first. */
export function listDecades(entries: ListEntry[]): number[] {
	const decades = new Set(
		entries.flatMap((entry) =>
			entry.film.year === null ? [] : [Math.floor(entry.film.year / 10) * 10]
		)
	);
	return [...decades].sort((a, b) => b - a);
}

/** Most works of a public list or chart a single action applies to. */
export const listActionMax = 100;

/** The list a page shows: one of the account, a public list or a TMDB chart. */
export type ListTarget = { personal: number } | { public: number } | { chart: Chart };

/** What is kept of a list an account likes, to show it among its likes. */
export interface LikedList {
	target: ListTarget;
	name: string;
	owner: string | null;
	itemCount: number | null;
	/** First works of the list, for its stack of posters. */
	preview: (FilmSummary & { kind: WorkKind })[];
}

/** Number of works kept to show a liked list. */
export const likedListPreviewSize = 5;
