import { and, desc, eq } from 'drizzle-orm';
import type { WatchedWork } from '../../catalog/library';
import type { DatabaseExecutor } from '../db/connection';
import { works, workStates } from '../db/schema';

/** Works an account has watched, most recently changed first. */
export function listWatched(db: DatabaseExecutor, userId: number): WatchedWork[] {
	return db
		.select({ work: works, rating: workStates.rating, liked: workStates.liked })
		.from(workStates)
		.innerJoin(works, eq(workStates.workId, works.id))
		.where(and(eq(workStates.userId, userId), eq(workStates.watched, true)))
		.orderBy(desc(workStates.updatedAt), desc(works.id))
		.all();
}

/** Identifiers at TMDB of the films an account has watched. */
export function listWatchedFilmIds(db: DatabaseExecutor, userId: number): Set<string> {
	const rows = db
		.select({ externalId: works.externalId })
		.from(workStates)
		.innerJoin(works, eq(workStates.workId, works.id))
		.where(and(eq(workStates.userId, userId), eq(workStates.watched, true), eq(works.kind, 'film')))
		.all();
	return new Set(rows.map((row) => row.externalId));
}
