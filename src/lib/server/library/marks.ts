import { eq } from 'drizzle-orm';
import type { WorkKind } from '../../catalog/library';
import type { DatabaseExecutor } from '../db/connection';
import { works, workStates } from '../db/schema';

/** Whether an account watched a work and how it rated it. */
export interface Mark {
	watched: boolean;
	rating: number | null;
}

export function markKey(kind: WorkKind, externalId: string | number): string {
	return `${kind}:${String(externalId)}`;
}

/** What an account did with each work it interacted with, by `markKey`. */
export function listMarks(db: DatabaseExecutor, userId: number): Map<string, Mark> {
	const rows = db
		.select({
			kind: works.kind,
			externalId: works.externalId,
			watched: workStates.watched,
			rating: workStates.rating
		})
		.from(workStates)
		.innerJoin(works, eq(workStates.workId, works.id))
		.where(eq(workStates.userId, userId))
		.all();
	return new Map(
		rows.map((row) => [
			markKey(row.kind, row.externalId),
			{ watched: row.watched, rating: row.rating }
		])
	);
}
