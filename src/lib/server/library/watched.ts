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
