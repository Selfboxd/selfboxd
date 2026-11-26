import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import type { DatabaseExecutor } from '../db/connection';
import { diaryEntryTags, listTags, tags, watchlistItemTags } from '../db/schema';

export type TagKind = (typeof tags.$inferSelect)['kind'];

/** Returns the identifiers of the named tags of an account, creating the missing ones. */
export function resolveTagIds(
	db: DatabaseExecutor,
	userId: number,
	kind: TagKind,
	names: string[]
): number[] {
	if (names.length === 0) return [];
	db.insert(tags)
		.values(names.map((name) => ({ userId, kind, name })))
		.onConflictDoNothing()
		.run();
	return db
		.select({ id: tags.id })
		.from(tags)
		.where(and(eq(tags.userId, userId), eq(tags.kind, kind), inArray(tags.name, names)))
		.all()
		.map((tag) => tag.id);
}

/** Deletes the tags of an account that no diary entry, watchlist item or list uses any more. */
export function deleteUnusedTags(db: DatabaseExecutor, userId: number): void {
	db.delete(tags)
		.where(
			and(
				eq(tags.userId, userId),
				notInArray(tags.id, db.select({ id: diaryEntryTags.tagId }).from(diaryEntryTags)),
				notInArray(tags.id, db.select({ id: watchlistItemTags.tagId }).from(watchlistItemTags)),
				notInArray(tags.id, db.select({ id: listTags.tagId }).from(listTags))
			)
		)
		.run();
}

/** Names of the tags of one kind an account uses, in alphabetical order. */
export function listTagNames(db: DatabaseExecutor, userId: number, kind: TagKind): string[] {
	return db
		.select({ name: tags.name })
		.from(tags)
		.where(and(eq(tags.userId, userId), eq(tags.kind, kind)))
		.orderBy(sql`${tags.name} collate nocase`)
		.all()
		.map((tag) => tag.name);
}
