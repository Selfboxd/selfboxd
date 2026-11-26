import {
	parseListOptions,
	type LikedList,
	type ListEntry,
	type ListOptions,
	type ListTarget
} from '../../catalog/list-view';
import { listNameMaxLength, type WorkKind } from '../../catalog/library';
import type { ListProgress } from '../../catalog/lists';
import { getDatabase } from '../db/index';
import { getTmdbContext } from '../tmdb/index';
import { requestLanguage } from '../tmdb/page';
import { getGenres, getSeriesGenres } from '../tmdb/service';
import { formFlag } from './forms';
import { isListLiked, setListLiked } from './list-likes';
import { appendToList, createListWithWorks } from './lists';
import { listMarks, markKey } from './marks';
import { loadWorkDetails } from './resolve';
import { chosenServices, streamingOn } from './services';
import { addAllToWatchlist } from './watchlist';
import { saveWork, type WorkInput } from './works';
import { fail, redirect } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import type { ShareRequest } from '../public/platform';
import { sharedUrl, shareList, stopSharing } from '../public/shares';

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

/** Adds the services streaming each work when the options filter by service. */
export async function withServices(
	entries: ListEntry[],
	options: ListOptions
): Promise<ListEntry[]> {
	if (options.service === null) return entries;
	return Promise.all(
		entries.map(async (entry) => ({
			...entry,
			services: await streamingOn(entry.film.kind ?? 'film', entry.film.id)
		}))
	);
}

/** Options of a list page and the services of the account, keeping only one of its services. */
export async function listChoices(userId: number, params: URLSearchParams) {
	const parsed = parseListOptions(params);
	const services = await chosenServices(userId);
	const service = services.some((entry) => entry.id === parsed.service) ? parsed.service : null;
	return { options: { ...parsed, service }, services };
}

/** Adds to the entries what the options need to narrow them: genres and services. */
export async function refineEntries(
	entries: ListEntry[],
	options: ListOptions
): Promise<ListEntry[]> {
	return withServices(await withGenres(entries, options), options);
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
export function progressOf(entries: Pick<ListEntry, 'watched'>[]): ListProgress | null {
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

/** Appends the given works to a list of the account; returns whether the list is its own. */
export function addWorksToList(userId: number, listId: number, works: WorkInput[]): boolean {
	return appendToList(getDatabase(), userId, listId, store(works));
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

/** Whether the account likes a list. */
export function likesList(userId: number, target: ListTarget): boolean {
	return isListLiked(getDatabase(), userId, target);
}

/** Likes or unlikes a list from the `liked` field of a form. */
export function likeList(userId: number, form: FormData, list: LikedList) {
	setListLiked(getDatabase(), userId, list, formFlag(form, 'liked'));
	return { action: 'like' as const, success: true };
}

/** Shares a list of the page on the platform, then goes back to the list, which shows the link. */
export async function shareAction(userId: number, target: ListTarget, list: ShareRequest) {
	const result = await shareList(getDatabase(), userId, target, list);
	if (!result.ok) return fail(502, { action: 'share' as const, error: result.error });
	redirect(303, getRequestEvent().url.pathname);
}

/** Stops sharing a list of the page. */
export async function unshareAction(userId: number, target: ListTarget) {
	const result = await stopSharing(getDatabase(), userId, target);
	if (!result.ok) return fail(502, { action: 'unshare' as const, error: result.error });
	redirect(303, getRequestEvent().url.pathname);
}

/** Address of the list of the page when the account shared it. */
export function sharedAddress(userId: number, target: ListTarget): string | null {
	return sharedUrl(getDatabase(), userId, target);
}

/** The TMDB identifiers of works, as a shared list sends them. */
export function shareItems(works: WorkInput[], notes: string[] = []): ShareRequest['items'] {
	return works.map((work, index) => ({
		kind: work.kind,
		id: Number(work.externalId),
		note: notes[index] ?? ''
	}));
}
