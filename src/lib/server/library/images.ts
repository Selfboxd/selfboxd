import { and, eq } from 'drizzle-orm';
import type { ImageChoice, ImageChoices } from '../../catalog/images';
import { imageKey } from '../../catalog/images';
import type { AppDatabase, DatabaseExecutor } from '../db/connection';
import { workImages, works } from '../db/schema';

/** Every poster and backdrop an account chose, by work. */
export function listImageChoices(db: DatabaseExecutor, userId: number): ImageChoices {
	const rows = db
		.select({
			kind: works.kind,
			externalId: works.externalId,
			poster: workImages.posterPath,
			backdrop: workImages.backdropPath
		})
		.from(workImages)
		.innerJoin(works, eq(workImages.workId, works.id))
		.where(eq(workImages.userId, userId))
		.all();
	return Object.fromEntries(
		rows.map((row) => [
			imageKey(row.kind, row.externalId),
			{ poster: row.poster, backdrop: row.backdrop }
		])
	);
}

/** The poster and backdrop an account chose for a work. */
export function getImageChoice(db: DatabaseExecutor, userId: number, workId: number): ImageChoice {
	const row = db
		.select({ poster: workImages.posterPath, backdrop: workImages.backdropPath })
		.from(workImages)
		.where(and(eq(workImages.userId, userId), eq(workImages.workId, workId)))
		.get();
	return row ?? { poster: null, backdrop: null };
}

/**
 * Changes the poster or the backdrop an account chose for a work; `null` goes back to the
 * one of TMDB. A work left with neither is forgotten.
 */
export function setImageChoice(
	db: AppDatabase,
	userId: number,
	workId: number,
	change: Partial<ImageChoice>
): ImageChoice {
	return db.transaction((transaction) => {
		const next = { ...getImageChoice(transaction, userId, workId), ...change };
		const where = and(eq(workImages.userId, userId), eq(workImages.workId, workId));
		if (next.poster === null && next.backdrop === null) {
			transaction.delete(workImages).where(where).run();
		} else {
			transaction
				.insert(workImages)
				.values({ userId, workId, posterPath: next.poster, backdropPath: next.backdrop })
				.onConflictDoUpdate({
					target: [workImages.userId, workImages.workId],
					set: { posterPath: next.poster, backdropPath: next.backdrop }
				})
				.run();
		}
		return next;
	});
}
