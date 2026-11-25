import { and, count, eq } from 'drizzle-orm';
import type { WorkState } from '../../catalog/library';
import type { AppDatabase, DatabaseExecutor } from '../db/connection';
import { diaryEntries, watchlistItems, workStates } from '../db/schema';

type StateChange = Partial<
	Pick<typeof workStates.$inferInsert, 'watched' | 'liked' | 'rating' | 'status'>
>;

function countEntries(db: DatabaseExecutor, userId: number, workId: number): number {
	return (
		db
			.select({ value: count() })
			.from(diaryEntries)
			.where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.workId, workId)))
			.get()?.value ?? 0
	);
}

/** Writes part of the state of a work for an account, keeping the rest. */
export function writeState(
	db: DatabaseExecutor,
	userId: number,
	workId: number,
	change: StateChange,
	now = new Date()
): void {
	db.insert(workStates)
		.values({ userId, workId, ...change, updatedAt: now })
		.onConflictDoUpdate({
			target: [workStates.userId, workStates.workId],
			set: { ...change, updatedAt: now }
		})
		.run();
}

export function removeFromWatchlist(db: DatabaseExecutor, userId: number, workId: number): void {
	db.delete(watchlistItems)
		.where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.workId, workId)))
		.run();
}

export function getWorkState(db: DatabaseExecutor, userId: number, workId: number): WorkState {
	const state = db
		.select()
		.from(workStates)
		.where(and(eq(workStates.userId, userId), eq(workStates.workId, workId)))
		.get();
	const listed = db
		.select({ id: watchlistItems.id })
		.from(watchlistItems)
		.where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.workId, workId)))
		.get();
	return {
		watched: state?.watched ?? false,
		liked: state?.liked ?? false,
		rating: state?.rating ?? null,
		inWatchlist: listed !== undefined,
		logCount: countEntries(db, userId, workId),
		status: state?.status ?? null
	};
}

/** The state of a work nobody has interacted with. */
export const emptyWorkState: WorkState = {
	watched: false,
	liked: false,
	rating: null,
	inWatchlist: false,
	logCount: 0,
	status: null
};

/**
 * Marks a work as watched, which takes it off the watchlist, or as not watched,
 * which also clears its rating. A work with diary entries stays watched.
 * Returns whether the change was applied.
 */
export function setWatched(
	db: AppDatabase,
	userId: number,
	workId: number,
	watched: boolean
): boolean {
	return db.transaction((transaction) => {
		if (watched) {
			writeState(transaction, userId, workId, { watched: true });
			removeFromWatchlist(transaction, userId, workId);
			return true;
		}
		if (countEntries(transaction, userId, workId) > 0) return false;
		writeState(transaction, userId, workId, { watched: false, rating: null });
		return true;
	});
}

export function setLiked(db: AppDatabase, userId: number, workId: number, liked: boolean): void {
	writeState(db, userId, workId, { liked });
}

/** Rates a work, which marks it as watched, or clears its rating with `null`. */
export function setRating(
	db: AppDatabase,
	userId: number,
	workId: number,
	rating: number | null
): void {
	db.transaction((transaction) => {
		if (rating === null) {
			writeState(transaction, userId, workId, { rating: null });
			return;
		}
		writeState(transaction, userId, workId, { rating, watched: true });
		removeFromWatchlist(transaction, userId, workId);
	});
}
