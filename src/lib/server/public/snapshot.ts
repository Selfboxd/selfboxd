import { eq } from 'drizzle-orm';
import { imageKey } from '../../catalog/images';
import type { Work } from '../../catalog/library';
import type { DatabaseExecutor } from '../db/connection';
import { users } from '../db/schema';
import { listDiaryEntries } from '../library/diary';
import { listImageChoices } from '../library/images';
import { getList, listLists } from '../library/lists';
import { getProfile, listFavourites, listLiked } from '../library/profile';
import { listWatched } from '../library/watched';
import { listWatchlist } from '../library/watchlist';

/** Version of the copy of a profile understood by the platform. */
const snapshotVersion = 1;

/** Path of an official TMDB picture, the only kind the platform accepts. */
const tmdbPath = /^\/[A-Za-z0-9_-]{1,120}\.(jpg|jpeg|png|webp|svg)$/;

interface SnapshotWork {
	kind: 'film' | 'series';
	id: number;
	title: string;
	year: number | null;
	posterPath: string | null;
}

/** Everything a public profile shows, in the shape the platform validates. */
export interface Snapshot {
	version: number;
	name: string;
	bio: string;
	location: string;
	ratingScale: 'stars' | 'ten';
	bannerPath: string | null;
	links: { website: string; instagram: string; x: string; discord: string };
	works: SnapshotWork[];
	favourites: { slot: number; work: number }[];
	diary: {
		id: number;
		work: number;
		watchedOn: string;
		season: number | null;
		rating: number | null;
		liked: boolean;
		rewatch: boolean;
		review: string;
		spoilers: boolean;
		pinned: boolean;
		tags: string[];
	}[];
	watched: { work: number; rating: number | null; liked: boolean }[];
	likes: number[];
	watchlist: { work: number; addedAt: string }[];
	lists: {
		id: number;
		name: string;
		description: string;
		ranked: boolean;
		updatedAt: string;
		items: { work: number; note: string }[];
	}[];
}

function picture(path: string | null): string | null {
	return path !== null && tmdbPath.test(path) ? path : null;
}

function day(date: Date | string): string {
	return (typeof date === 'string' ? date : date.toISOString()).slice(0, 10);
}

/**
 * The copy of the profile of an account sent to the platform: nothing about the person, the
 * machine or the instance beyond what the account entered. Posters are the ones the account
 * chose, as long as they are official ones.
 */
export function buildSnapshot(db: DatabaseExecutor, userId: number): Snapshot {
	const user = db
		.select({ username: users.username, ratingScale: users.ratingScale })
		.from(users)
		.where(eq(users.id, userId))
		.get();
	if (!user) throw new Error('Unknown account');
	const profile = getProfile(db, userId);
	const choices = listImageChoices(db, userId);

	const works: SnapshotWork[] = [];
	const indexes = new Map<string, number>();
	const index = (work: Work): number => {
		const key = imageKey(work.kind, work.externalId);
		const known = indexes.get(key);
		if (known !== undefined) return known;
		const year = work.year !== null && work.year >= 1800 && work.year <= 2200 ? work.year : null;
		works.push({
			kind: work.kind,
			id: Number(work.externalId),
			title: work.title.slice(0, 500),
			year,
			posterPath: picture(choices[key]?.poster ?? null) ?? picture(work.posterPath)
		});
		indexes.set(key, works.length - 1);
		return works.length - 1;
	};

	const favourites = listFavourites(db, userId).flatMap((work, slot) =>
		work ? [{ slot: slot + 1, work: index(work) }] : []
	);
	const diary = listDiaryEntries(db, userId).map((entry) => ({
		id: entry.id,
		work: index(entry.work),
		watchedOn: entry.watchedOn,
		season: entry.season,
		rating: entry.rating,
		liked: entry.liked,
		rewatch: entry.rewatch,
		review: entry.review.slice(0, 20_000),
		spoilers: entry.containsSpoilers,
		pinned: entry.pinned,
		tags: entry.tags.slice(0, 20).map((tag) => tag.slice(0, 50))
	}));
	const watched = listWatched(db, userId)
		.reverse()
		.map((entry) => ({ work: index(entry.work), rating: entry.rating, liked: entry.liked }));
	const likes = listLiked(db, userId).map((entry) => index(entry.work));
	const watchlist = listWatchlist(db, userId).map((item) => ({
		work: index(item.work),
		addedAt: day(item.addedAt)
	}));
	const lists = listLists(db, userId).flatMap((summary) => {
		const list = getList(db, userId, summary.id);
		if (!list) return [];
		return [
			{
				id: list.id,
				name: list.name.slice(0, 100),
				description: list.description.slice(0, 5_000),
				ranked: list.ranked,
				updatedAt: day(list.updatedAt),
				items: list.items.map((item) => ({
					work: index(item.work),
					note: item.note.slice(0, 1_000)
				}))
			}
		];
	});

	return {
		version: snapshotVersion,
		name: user.username.slice(0, 50),
		bio: profile.bio.slice(0, 1_000),
		location: profile.location.slice(0, 100),
		ratingScale: user.ratingScale,
		bannerPath: picture(profile.bannerPath),
		links: profile.links,
		works,
		favourites,
		diary,
		watched,
		likes,
		watchlist,
		lists
	};
}
