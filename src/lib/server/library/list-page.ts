import type { ListEntry, ListOptions } from '../../catalog/list-view';
import { listNameMaxLength, type WorkKind } from '../../catalog/library';
import type { ListProgress } from '../../catalog/lists';
import { getDatabase } from '../db/index';
import { getTmdbContext } from '../tmdb/index';
import { requestLanguage } from '../tmdb/page';
import { getGenres, getSeriesGenres } from '../tmdb/service';
import { createListWithWorks } from './lists';
import { listMarks, markKey } from './marks';
import { loadWorkDetails } from './resolve';
import { addAllToWatchlist } from './watchlist';
import { saveWork, type WorkInput } from './works';

/** A work of a list as the page shows it, before what the account did with it is known. */
export interface ListedWork {
	film: ListEntry['film'];
	note?: string;
}

/** Entries of a list, numbered from `first`, with what the account did with each work. */
export function toEntries(userId: number, works: ListedWork[], first = 1): ListEntry[] {
	const marks = listMarks(getDatabase(), userId);
	return works.map(({ film, note }, index) => {
		const mark = marks.get(markKey(film.kind ?? 'film', film.id));
		return {
			film,
			position: first + index,
			note: note ?? '',
			watched: mark?.watched ?? false,
			rating: mark?.rating ?? null
		};
	});
}

/** Adds the genres of each work, from the TMDB cache, when the options filter by genre. */
export async function withGenres(entries: ListEntry[], options: ListOptions): Promise<ListEntry[]> {
	const context = getTmdbContext();
	if (options.genre === null || !context) return entries;
	return Promise.all(
		entries.map(async (entry) => {
			const kind: WorkKind = entry.film.kind ?? 'film';
			const details = await loadWorkDetails(context, kind, String(entry.film.id));
			return { ...entry, genres: details.ok ? details.value.genres : [] };
		})
	);
}

/** Genres a list can be narrowed to: those of films and of series, in alphabetical order. */
export async function genreChoices(): Promise<string[]> {
	const context = getTmdbContext();
	if (!context) return [];
	const language = requestLanguage();
	const loaded = await Promise.all([
		getGenres(context, language),
		getSeriesGenres(context, language)
	]);
	const names = new Set(
		loaded.flatMap((result) => (result.ok ? result.value : [])).map((genre) => genre.name)
	);
	return [...names].sort((a, b) => a.localeCompare(b));
}

/** How much of a list the account has watched, or `null` for an empty list. */
export function progressOf(entries: ListEntry[]): ListProgress | null {
	if (entries.length === 0) return null;
	return { watched: entries.filter((entry) => entry.watched).length, total: entries.length };
}

function store(works: WorkInput[]): number[] {
	const db = getDatabase();
	return works.map((work) => saveWork(db, work).id);
}

/** Makes a list of the account holding the given works and returns its identifier. */
export function cloneWorks(
	userId: number,
	name: string,
	description: string,
	works: WorkInput[]
): number {
	return createListWithWorks(
		getDatabase(),
		userId,
		{ name: name.slice(0, listNameMaxLength), description, ranked: false },
		store(works)
	);
}

/** Puts the given works on the watchlist of the account. */
export function watchlistWorks(userId: number, works: WorkInput[]): void {
	addAllToWatchlist(getDatabase(), userId, store(works));
}

/** The work stored for a film or series shown in a list. */
export function workInput(film: ListEntry['film']): WorkInput {
	return {
		kind: film.kind ?? 'film',
		externalId: String(film.id),
		title: film.title,
		year: film.year,
		posterPath: film.posterPath
	};
}
