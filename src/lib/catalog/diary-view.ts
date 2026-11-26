import type { DiaryEntry } from './library';

/** Orders offered for the diary; the first is the default. */
export const diarySorts = [
	'watched',
	'watched_oldest',
	'release',
	'release_oldest',
	'rating',
	'rating_lowest',
	'name'
] as const;

export type DiarySort = (typeof diarySorts)[number];

/** Which entries the diary shows by how the work was watched. */
export const diaryShows = ['all', 'first', 'rewatches', 'reviews'] as const;

export type DiaryShow = (typeof diaryShows)[number];

export interface DiaryOptions {
	/** Stored rating from 1 to 10, `none` for entries without one, `null` for any. */
	rating: number | 'none' | null;
	/** Year the entries were watched in. */
	year: number | null;
	/** First year of the decade the works were released in. */
	decade: number | null;
	genre: string | null;
	/** Identifier of a TMDB watch provider the works must stream on. */
	service: number | null;
	tag: string | null;
	sort: DiarySort;
	show: DiaryShow;
}

/** A diary entry with the genres of its work, when they were loaded. */
export type DiaryRow = DiaryEntry & { genres?: string[]; services?: number[] };

export const defaultDiaryOptions: DiaryOptions = {
	rating: null,
	year: null,
	decade: null,
	genre: null,
	service: null,
	tag: null,
	sort: 'watched',
	show: 'all'
};

function year(value: string | null): number | null {
	return value !== null && /^\d{4}$/.test(value) ? Number(value) : null;
}

/** Reads the options of the diary from its query string, ignoring invalid values. */
export function parseDiaryOptions(params: URLSearchParams): DiaryOptions {
	const rating = params.get('rating');
	const decade = year(params.get('decade'));
	const service = params.get('service');
	const text = (name: string) => {
		const value = params.get(name)?.trim();
		return value ? value.slice(0, 100) : null;
	};
	return {
		rating:
			rating === 'none'
				? 'none'
				: rating !== null && /^(10|[1-9])$/.test(rating)
					? Number(rating)
					: null,
		year: year(params.get('year')),
		decade: decade !== null && decade % 10 === 0 ? decade : null,
		genre: text('genre'),
		service: service !== null && /^\d{1,9}$/.test(service) ? Number(service) : null,
		tag: text('tag'),
		sort: diarySorts.find((sort) => sort === params.get('sort')) ?? 'watched',
		show: diaryShows.find((show) => show === params.get('show')) ?? 'all'
	};
}

/** Query string of the diary, leaving out default values. */
export function diaryQuery(options: DiaryOptions): string {
	const params = new URLSearchParams();
	if (options.rating !== null) params.set('rating', String(options.rating));
	if (options.year !== null) params.set('year', String(options.year));
	if (options.decade !== null) params.set('decade', String(options.decade));
	if (options.genre !== null) params.set('genre', options.genre);
	if (options.service !== null) params.set('service', String(options.service));
	if (options.tag !== null) params.set('tag', options.tag);
	if (options.sort !== 'watched') params.set('sort', options.sort);
	if (options.show !== 'all') params.set('show', options.show);
	return params.toString();
}

function byNumber(a: number | null, b: number | null, direction: 1 | -1): number {
	if (a === b) return 0;
	if (a === null) return 1;
	if (b === null) return -1;
	return (a - b) * direction;
}

const sorters: Record<DiarySort, (a: DiaryRow, b: DiaryRow) => number> = {
	watched: (a, b) => b.watchedOn.localeCompare(a.watchedOn) || b.id - a.id,
	watched_oldest: (a, b) => a.watchedOn.localeCompare(b.watchedOn) || a.id - b.id,
	release: (a, b) => byNumber(a.work.year, b.work.year, -1),
	release_oldest: (a, b) => byNumber(a.work.year, b.work.year, 1),
	rating: (a, b) => byNumber(a.rating, b.rating, -1),
	rating_lowest: (a, b) => byNumber(a.rating, b.rating, 1),
	name: (a, b) => a.work.title.localeCompare(b.work.title)
};

const shows: Record<DiaryShow, (entry: DiaryRow) => boolean> = {
	all: () => true,
	first: (entry) => !entry.rewatch,
	rewatches: (entry) => entry.rewatch,
	reviews: (entry) => entry.review.trim() !== ''
};

/** Entries matching the options, in their order. */
export function applyDiaryOptions<T extends DiaryRow>(entries: T[], options: DiaryOptions): T[] {
	return entries
		.filter(
			(entry) =>
				(options.rating === null ||
					(options.rating === 'none' ? entry.rating === null : entry.rating === options.rating)) &&
				(options.year === null || entry.watchedOn.startsWith(String(options.year))) &&
				(options.decade === null ||
					(entry.work.year !== null &&
						entry.work.year >= options.decade &&
						entry.work.year < options.decade + 10)) &&
				(options.genre === null || (entry.genres ?? []).includes(options.genre)) &&
				(options.service === null || (entry.services ?? []).includes(options.service)) &&
				(options.tag === null || entry.tags.includes(options.tag)) &&
				shows[options.show](entry)
		)
		.toSorted(sorters[options.sort]);
}

/** Years the entries were watched in, newest first. */
export function diaryYears(entries: DiaryEntry[]): number[] {
	return [...new Set(entries.map((entry) => Number(entry.watchedOn.slice(0, 4))))].sort(
		(a, b) => b - a
	);
}

/** Decades the works of the entries were released in, newest first. */
export function diaryDecades(entries: DiaryEntry[]): number[] {
	const decades = entries.flatMap((entry) =>
		entry.work.year === null ? [] : [Math.floor(entry.work.year / 10) * 10]
	);
	return [...new Set(decades)].sort((a, b) => b - a);
}
