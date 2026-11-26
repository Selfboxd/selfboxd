import { and, count, countDistinct, desc, eq, isNotNull, like } from 'drizzle-orm';
import {
	emptyLinks,
	favouriteSlots,
	ratingMax,
	type Profile,
	type ProfileStats,
	type TagCount,
	type WatchedWork,
	type Work,
	type WorkKind
} from '../../catalog/library';
import type { AppDatabase, DatabaseExecutor } from '../db/connection';
import {
	diaryEntries,
	diaryEntryTags,
	favourites,
	lists,
	tags,
	users,
	works,
	workStates
} from '../db/schema';

export function getProfile(db: DatabaseExecutor, userId: number): Profile {
	const row = db
		.select({
			bio: users.bio,
			location: users.location,
			bannerPath: users.bannerPath,
			website: users.website,
			instagram: users.instagram,
			x: users.xHandle
		})
		.from(users)
		.where(eq(users.id, userId))
		.get();
	if (!row) return { bio: '', location: '', bannerPath: null, links: emptyLinks };
	const { website, instagram, x, ...profile } = row;
	return { ...profile, links: { website, instagram, x } };
}

export function updateProfile(
	db: DatabaseExecutor,
	userId: number,
	input: Pick<Profile, 'bio' | 'location' | 'links'>
): void {
	const { website, instagram, x } = input.links;
	db.update(users)
		.set({ bio: input.bio, location: input.location, website, instagram, xHandle: x })
		.where(eq(users.id, userId))
		.run();
}

export function setBanner(db: DatabaseExecutor, userId: number, bannerPath: string | null): void {
	db.update(users).set({ bannerPath }).where(eq(users.id, userId)).run();
}

/** Favourite works of an account, one entry per slot, `null` for an empty slot. */
export function listFavourites(db: DatabaseExecutor, userId: number): (Work | null)[] {
	const rows = db
		.select({ slot: favourites.slot, work: works })
		.from(favourites)
		.innerJoin(works, eq(favourites.workId, works.id))
		.where(eq(favourites.userId, userId))
		.all();
	return Array.from(
		{ length: favouriteSlots },
		(_, index) => rows.find((row) => row.slot === index + 1)?.work ?? null
	);
}

/**
 * Puts a work in a favourite slot of an account, from 1 to `favouriteSlots`.
 * The work leaves the slot it was in before. Returns whether the slot exists.
 */
export function setFavourite(
	db: AppDatabase,
	userId: number,
	slot: number,
	workId: number
): boolean {
	if (!Number.isInteger(slot) || slot < 1 || slot > favouriteSlots) return false;
	db.transaction((transaction) => {
		transaction
			.delete(favourites)
			.where(and(eq(favourites.userId, userId), eq(favourites.workId, workId)))
			.run();
		transaction
			.insert(favourites)
			.values({ userId, slot, workId })
			.onConflictDoUpdate({ target: [favourites.userId, favourites.slot], set: { workId } })
			.run();
	});
	return true;
}

export function clearFavourite(db: DatabaseExecutor, userId: number, slot: number): void {
	db.delete(favourites)
		.where(and(eq(favourites.userId, userId), eq(favourites.slot, slot)))
		.run();
}

export function getProfileStats(
	db: DatabaseExecutor,
	userId: number,
	now = new Date()
): ProfileStats {
	const total = (query: { get: () => { value: number } | undefined }) => query.get()?.value ?? 0;
	const watched = (kind: WorkKind) =>
		total(
			db
				.select({ value: count() })
				.from(workStates)
				.innerJoin(works, eq(workStates.workId, works.id))
				.where(
					and(eq(workStates.userId, userId), eq(workStates.watched, true), eq(works.kind, kind))
				)
		);
	return {
		films: watched('film'),
		series: watched('series'),
		thisYear: total(
			db
				.select({ value: countDistinct(diaryEntries.workId) })
				.from(diaryEntries)
				.where(
					and(
						eq(diaryEntries.userId, userId),
						like(diaryEntries.watchedOn, `${String(now.getUTCFullYear())}-%`)
					)
				)
		),
		lists: total(db.select({ value: count() }).from(lists).where(eq(lists.userId, userId)))
	};
}

/** Number of works an account gave each rating, from the lowest rating to the highest. */
export function getRatingHistogram(db: DatabaseExecutor, userId: number): number[] {
	const rows = db
		.select({ rating: workStates.rating, value: count() })
		.from(workStates)
		.where(and(eq(workStates.userId, userId), isNotNull(workStates.rating)))
		.groupBy(workStates.rating)
		.all();
	return Array.from(
		{ length: ratingMax },
		(_, index) => rows.find((row) => row.rating === index + 1)?.value ?? 0
	);
}

/** Works an account likes, most recently changed first. */
export function listLiked(db: DatabaseExecutor, userId: number): WatchedWork[] {
	return db
		.select({ work: works, rating: workStates.rating, liked: workStates.liked })
		.from(workStates)
		.innerJoin(works, eq(workStates.workId, works.id))
		.where(and(eq(workStates.userId, userId), eq(workStates.liked, true)))
		.orderBy(desc(workStates.updatedAt), desc(works.id))
		.all();
}

/** Diary tags of an account with the number of entries carrying each, most used first. */
export function listTagCounts(db: DatabaseExecutor, userId: number): TagCount[] {
	return db
		.select({ name: tags.name, count: count() })
		.from(diaryEntryTags)
		.innerJoin(tags, eq(diaryEntryTags.tagId, tags.id))
		.where(and(eq(tags.userId, userId), eq(tags.kind, 'diary')))
		.groupBy(tags.id)
		.orderBy(desc(count()), tags.name)
		.all();
}
