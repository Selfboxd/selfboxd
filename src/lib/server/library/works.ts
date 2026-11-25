import { and, eq } from 'drizzle-orm';
import type { Work, WorkKind } from '../../catalog/library';
import type { DatabaseExecutor } from '../db/connection';
import { works } from '../db/schema';

export type WorkInput = Omit<Work, 'id'>;

/** Stores a work, or refreshes its title, year and poster, and returns it. */
export function saveWork(db: DatabaseExecutor, input: WorkInput): Work {
	const values = { title: input.title, year: input.year, posterPath: input.posterPath };
	return db
		.insert(works)
		.values({ kind: input.kind, externalId: input.externalId, ...values })
		.onConflictDoUpdate({ target: [works.kind, works.externalId], set: values })
		.returning()
		.get();
}

export function findWork(
	db: DatabaseExecutor,
	kind: WorkKind,
	externalId: string
): Work | undefined {
	return db
		.select()
		.from(works)
		.where(and(eq(works.kind, kind), eq(works.externalId, externalId)))
		.get();
}
