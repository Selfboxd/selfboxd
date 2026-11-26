import {
	bioMaxLength,
	favouriteSlots,
	locationMaxLength,
	type WorkState
} from '../../catalog/library';
import type { AppDatabase } from '../db/connection';
import type { WorkMatch } from '../tmdb/service';
import { createDiaryEntry, listDiaryEntries } from '../library/diary';
import { appendToList, createListWithWorks, listLists, setListItemNote } from '../library/lists';
import { getProfile, listFavourites, setFavourite, updateProfile } from '../library/profile';
import { getWorkState, setLiked, setRating, setWatched } from '../library/states';
import { addToWatchlist, listWatchlist } from '../library/watchlist';
import { findWork, saveWork } from '../library/works';
import type { LetterboxdExport } from './letterboxd';

/** TMDB works found for the films of an export, by key; a missing key was not found. */
export type FilmMatches = Map<string, WorkMatch>;

/** How to settle what the export and the library disagree on. */
export interface ImportChoices {
	/** Diary entries already in the diary on the same day: left out, or added again. */
	duplicates: 'skip' | 'add';
	/** Ratings that differ from the ones of the library. */
	ratings: 'keep' | 'replace';
	/** Bio, location and website already filled in. */
	profile: 'keep' | 'replace';
	/** Favourites already chosen. */
	favourites: 'keep' | 'replace';
	/** Lists named like a list of the account: merged into it, imported as a copy, or left out. */
	lists: 'merge' | 'copy' | 'skip';
	/** Whether imported lists keep their order as a ranking. */
	ranked: boolean;
}

export const defaultImportChoices: ImportChoices = {
	duplicates: 'skip',
	ratings: 'keep',
	profile: 'keep',
	favourites: 'keep',
	lists: 'merge',
	ranked: true
};

/** What an import holds and where it disagrees with the library, shown before it runs. */
export interface ImportReview {
	counts: {
		films: number;
		found: number;
		diary: number;
		reviews: number;
		ratings: number;
		watched: number;
		likes: number;
		watchlist: number;
		lists: number;
	};
	missing: { name: string; year: number | null }[];
	conflicts: {
		duplicates: number;
		ratings: { title: string; mine: number; theirs: number }[];
		profile: ('bio' | 'location' | 'website')[];
		favourites: boolean;
		lists: string[];
	};
}

/** What an import added to the library. */
export interface ImportSummary {
	diary: number;
	ratings: number;
	watched: number;
	likes: number;
	watchlist: number;
	lists: number;
	skipped: number;
}

function normalizedWebsite(value: string): string {
	if (!value) return '';
	const address = /^https?:\/\//i.test(value) ? value : `https://${value}`;
	try {
		const url = new URL(address);
		return url.hostname.includes('.') && address.length <= 200 ? url.toString() : '';
	} catch {
		return '';
	}
}

function day(entryDay: string, workId: number): string {
	return `${String(workId)}|${entryDay}`;
}

/** Compares an export with the library of an account, without changing anything. */
export function reviewImport(
	db: AppDatabase,
	userId: number,
	data: LetterboxdExport,
	matches: FilmMatches
): ImportReview {
	const known = (key: string) => {
		const match = matches.get(key);
		return match ? findWork(db, match.kind, String(match.id)) : undefined;
	};

	const logged = new Set(
		listDiaryEntries(db, userId).map((entry) => day(entry.watchedOn, entry.work.id))
	);
	const duplicates = data.diary.filter((entry) => {
		const work = known(entry.film);
		return work !== undefined && logged.has(day(entry.watchedOn, work.id));
	}).length;

	const ratings = data.ratings.flatMap((entry) => {
		const work = known(entry.film);
		if (!work) return [];
		const mine = getWorkState(db, userId, work.id).rating;
		return mine !== null && mine !== entry.rating
			? [{ title: work.title, mine, theirs: entry.rating }]
			: [];
	});

	const profile = getProfile(db, userId);
	const incoming = { ...data.profile, website: normalizedWebsite(data.profile.website) };
	const profileConflicts = (['bio', 'location', 'website'] as const).filter((field) => {
		const current = field === 'website' ? profile.links.website : profile[field];
		return current !== '' && incoming[field] !== '' && current !== incoming[field];
	});

	const chosen = listFavourites(db, userId).filter((work) => work !== null);
	const existingNames = new Set(listLists(db, userId).map((list) => list.name.toLowerCase()));

	return {
		counts: {
			films: data.films.size,
			found: [...data.films.keys()].filter((key) => matches.has(key)).length,
			diary: data.diary.length,
			reviews: data.diary.filter((entry) => entry.review !== '').length,
			ratings: data.ratings.length,
			watched: new Set(data.watched).size,
			likes: new Set(data.likes).size,
			watchlist: data.watchlist.length,
			lists: data.lists.length
		},
		missing: [...data.films.values()]
			.filter((film) => !matches.has(film.key))
			.map(({ name, year }) => ({ name, year })),
		conflicts: {
			duplicates,
			ratings,
			profile: profileConflicts,
			favourites: chosen.length > 0 && data.profile.favourites.length > 0,
			lists: data.lists
				.filter((list) => existingNames.has(list.name.toLowerCase()))
				.map((list) => list.name)
		}
	};
}

/** Adds an export to the library of an account, settling disagreements as chosen. */
export function applyImport(
	db: AppDatabase,
	userId: number,
	data: LetterboxdExport,
	matches: FilmMatches,
	choices: ImportChoices
): ImportSummary {
	const summary: ImportSummary = {
		diary: 0,
		ratings: 0,
		watched: 0,
		likes: 0,
		watchlist: 0,
		lists: 0,
		skipped: 0
	};

	/** States of the works before the import, to put back what the choices keep. */
	const before = new Map<number, WorkState>();
	const ids = new Map<string, number>();
	const workId = (key: string): number | undefined => {
		const known = ids.get(key);
		if (known !== undefined) return known;
		const match = matches.get(key);
		if (!match) return undefined;
		const existing = findWork(db, match.kind, String(match.id));
		const work =
			existing ??
			saveWork(db, {
				kind: match.kind,
				externalId: String(match.id),
				title: match.title,
				year: match.year,
				posterPath: match.posterPath
			});
		if (existing) before.set(work.id, getWorkState(db, userId, work.id));
		ids.set(key, work.id);
		return work.id;
	};

	const logged = new Set(
		listDiaryEntries(db, userId).map((entry) => day(entry.watchedOn, entry.work.id))
	);
	for (const entry of data.diary) {
		const id = workId(entry.film);
		if (id === undefined) {
			summary.skipped++;
			continue;
		}
		if (choices.duplicates === 'skip' && logged.has(day(entry.watchedOn, id))) continue;
		createDiaryEntry(db, userId, id, {
			watchedOn: entry.watchedOn,
			season: null,
			status: null,
			rating: entry.rating,
			liked: before.get(id)?.liked ?? false,
			rewatch: entry.rewatch,
			review: entry.review,
			containsSpoilers: false,
			tags: entry.tags
		});
		summary.diary++;
	}

	for (const key of new Set(data.watched)) {
		const id = workId(key);
		if (id !== undefined && setWatched(db, userId, id, true)) summary.watched++;
	}

	for (const entry of data.ratings) {
		const id = workId(entry.film);
		if (id === undefined) continue;
		const mine = before.get(id)?.rating ?? null;
		if (mine !== null && choices.ratings === 'keep') continue;
		setRating(db, userId, id, entry.rating);
		summary.ratings++;
	}

	for (const key of new Set(data.likes)) {
		const id = workId(key);
		if (id === undefined) continue;
		setLiked(db, userId, id, true);
		summary.likes++;
	}

	const listed = new Set(listWatchlist(db, userId).map((item) => item.work.id));
	for (const entry of data.watchlist) {
		const id = workId(entry.film);
		if (id === undefined || listed.has(id)) continue;
		const addedAt = entry.addedOn ? new Date(`${entry.addedOn}T12:00:00Z`) : new Date();
		addToWatchlist(db, userId, id, { note: '', tags: [] }, addedAt);
		listed.add(id);
		summary.watchlist++;
	}

	const existing = new Map(listLists(db, userId).map((list) => [list.name.toLowerCase(), list.id]));
	for (const list of data.lists) {
		const items = list.items.flatMap((item) => {
			const id = workId(item.film);
			return id === undefined ? [] : [{ id, note: item.note }];
		});
		const sameName = existing.get(list.name.toLowerCase());
		if (sameName !== undefined && choices.lists === 'skip') continue;
		let listId: number;
		if (sameName !== undefined && choices.lists === 'merge') {
			appendToList(
				db,
				userId,
				sameName,
				items.map((item) => item.id)
			);
			listId = sameName;
		} else {
			listId = createListWithWorks(
				db,
				userId,
				{
					name: sameName === undefined ? list.name : `${list.name} (Letterboxd)`,
					description: list.description,
					ranked: choices.ranked
				},
				items.map((item) => item.id)
			);
		}
		for (const item of items) {
			if (item.note) setListItemNote(db, userId, listId, item.id, item.note.slice(0, 1_000));
		}
		summary.lists++;
	}

	const profile = getProfile(db, userId);
	const pick = (current: string, incoming: string) =>
		incoming !== '' && (current === '' || choices.profile === 'replace') ? incoming : current;
	updateProfile(db, userId, {
		bio: pick(profile.bio, data.profile.bio.slice(0, bioMaxLength)),
		location: pick(profile.location, data.profile.location.slice(0, locationMaxLength)),
		links: {
			...profile.links,
			website: pick(profile.links.website, normalizedWebsite(data.profile.website))
		}
	});

	const hasFavourites = listFavourites(db, userId).some((work) => work !== null);
	if (!hasFavourites || choices.favourites === 'replace') {
		data.profile.favourites.slice(0, favouriteSlots).forEach((key, index) => {
			const id = workId(key);
			if (id !== undefined) setFavourite(db, userId, index + 1, id);
		});
	}

	for (const [id, state] of before) {
		if (state.liked) setLiked(db, userId, id, true);
		if (state.rating !== null && choices.ratings === 'keep')
			setRating(db, userId, id, state.rating);
	}

	return summary;
}
