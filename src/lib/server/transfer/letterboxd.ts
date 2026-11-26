import { parseCsv } from './csv';

/** A film as Letterboxd names it, before it is found on TMDB. */
export interface LetterboxdFilm {
	/** Name and year together, which tell films apart within one export. */
	key: string;
	name: string;
	year: number | null;
}

export interface LetterboxdEntry {
	film: string;
	watchedOn: string;
	/** Rating from 1 to 10, `null` without one. */
	rating: number | null;
	rewatch: boolean;
	review: string;
	tags: string[];
}

export interface LetterboxdList {
	name: string;
	description: string;
	tags: string[];
	items: { film: string; note: string }[];
}

/** Everything of a Letterboxd export that Selfboxd keeps. Social data is left out. */
export interface LetterboxdExport {
	profile: { bio: string; location: string; website: string; favourites: string[] };
	films: Map<string, LetterboxdFilm>;
	diary: LetterboxdEntry[];
	ratings: { film: string; rating: number }[];
	watched: string[];
	likes: string[];
	watchlist: { film: string; addedOn: string }[];
	lists: LetterboxdList[];
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

type Row = Record<string, string>;

/** Rows of a CSV file as records keyed by the names of its header. */
function records(rows: string[][]): Row[] {
	const [header, ...body] = rows;
	if (!header) return [];
	return body
		.filter((row) => row.some((value) => value.trim() !== ''))
		.map((row) => Object.fromEntries(header.map((name, index) => [name.trim(), row[index] ?? ''])));
}

function text(files: Map<string, Uint8Array>, name: string): string | null {
	const file = files.get(name);
	return file ? new TextDecoder().decode(file) : null;
}

function rating(value: string | undefined): number | null {
	const stars = Number(value);
	if (!value || !Number.isFinite(stars)) return null;
	const stored = Math.round(stars * 2);
	return stored >= 1 && stored <= 10 ? stored : null;
}

function tags(value: string | undefined): string[] {
	return (value ?? '')
		.split(',')
		.map((tag) => tag.trim().toLowerCase())
		.filter(Boolean);
}

/** Whether a file of the archive is one of the export, not a deleted or orphaned copy. */
function isCurrent(name: string): boolean {
	return !name.startsWith('deleted/') && !name.startsWith('orphaned/');
}

/**
 * Reads a Letterboxd export from the files of its archive, or returns `null` when the archive
 * is not one. Reviews join the diary entries they belong to; comments and likes of other
 * members are left out.
 */
export function parseLetterboxd(files: Map<string, Uint8Array>): LetterboxdExport | null {
	const diaryText = text(files, 'diary.csv');
	const watchedText = text(files, 'watched.csv');
	if (diaryText === null && watchedText === null) return null;

	const films = new Map<string, LetterboxdFilm>();
	const byUri = new Map<string, string>();

	/** Registers the film of a row and returns its key, or `null` for a row without a name. */
	function film(row: Row): string | null {
		const name = (row.Name ?? '').trim();
		if (!name) return null;
		const yearValue = Number(row.Year);
		const year = Number.isInteger(yearValue) && yearValue > 1800 ? yearValue : null;
		const key = `${name.toLowerCase()}|${String(year ?? '')}`;
		if (!films.has(key)) films.set(key, { key, name, year });
		return key;
	}

	function rows(name: string): Row[] {
		const content = text(files, name);
		return content === null ? [] : records(parseCsv(content));
	}

	const watched = rows('watched.csv').flatMap((row) => {
		const key = film(row);
		if (key && row['Letterboxd URI']) byUri.set(row['Letterboxd URI'], key);
		return key ? [key] : [];
	});
	const ratings = rows('ratings.csv').flatMap((row) => {
		const key = film(row);
		if (key && row['Letterboxd URI']) byUri.set(row['Letterboxd URI'], key);
		const value = rating(row.Rating);
		return key && value !== null ? [{ film: key, rating: value }] : [];
	});
	const likes = rows('likes/films.csv').flatMap((row) => {
		const key = film(row);
		if (key && row['Letterboxd URI']) byUri.set(row['Letterboxd URI'], key);
		return key ? [key] : [];
	});
	const watchlist = rows('watchlist.csv').flatMap((row) => {
		const key = film(row);
		if (key && row['Letterboxd URI']) byUri.set(row['Letterboxd URI'], key);
		const addedOn = row.Date ?? '';
		return key ? [{ film: key, addedOn: isoDate.test(addedOn) ? addedOn : '' }] : [];
	});

	const reviews = new Map<string, Row>();
	for (const row of rows('reviews.csv')) {
		if (row['Letterboxd URI']) reviews.set(row['Letterboxd URI'], row);
	}

	const diary: LetterboxdEntry[] = [];
	const entry = (row: Row, review: string): void => {
		const key = film(row);
		const watchedOn = row['Watched Date'] || row.Date || '';
		if (!key || !isoDate.test(watchedOn)) return;
		diary.push({
			film: key,
			watchedOn,
			rating: rating(row.Rating),
			rewatch: (row.Rewatch ?? '').toLowerCase() === 'yes',
			review: review.trim(),
			tags: tags(row.Tags)
		});
	};
	for (const row of rows('diary.csv')) {
		const uri = row['Letterboxd URI'] ?? '';
		const review = reviews.get(uri);
		reviews.delete(uri);
		entry(row, review?.Review ?? '');
	}
	for (const row of reviews.values()) entry(row, row.Review ?? '');

	const lists: LetterboxdList[] = [...files.keys()]
		.filter((name) => isCurrent(name) && /^lists\/[^/]+\.csv$/.test(name))
		.sort()
		.flatMap((name) => {
			const parsed = parseCsv(text(files, name) ?? '');
			const headerAt = parsed.findIndex((row) => row[0] === 'Date' && row[1] === 'Name');
			const itemsAt = parsed.findIndex((row) => row[0] === 'Position');
			const header = headerAt >= 0 ? records(parsed.slice(headerAt, headerAt + 2))[0] : undefined;
			if (!header?.Name) return [];
			const items =
				itemsAt >= 0
					? records(parsed.slice(itemsAt)).flatMap((row) => {
							const key = film(row);
							return key ? [{ film: key, note: (row.Description ?? '').trim() }] : [];
						})
					: [];
			return [
				{
					name: header.Name.trim(),
					description: (header.Description ?? '').trim(),
					tags: tags(header.Tags),
					items
				}
			];
		});

	const profileRow = rows('profile.csv')[0];
	const favourites = (profileRow?.['Favorite Films'] ?? '')
		.split(',')
		.map((uri) => byUri.get(uri.trim()))
		.filter((key) => key !== undefined);

	return {
		profile: {
			bio: (profileRow?.Bio ?? '').trim(),
			location: (profileRow?.Location ?? '').trim(),
			website: (profileRow?.Website ?? '').trim(),
			favourites
		},
		films,
		diary,
		ratings,
		watched,
		likes,
		watchlist,
		lists
	};
}
