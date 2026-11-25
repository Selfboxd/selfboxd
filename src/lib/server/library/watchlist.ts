import { and, desc, eq, inArray } from 'drizzle-orm';
import type { WatchlistItem } from '../../catalog/library';
import type { AppDatabase, DatabaseExecutor } from '../db/connection';
import { tags, watchlistItemTags, watchlistItems, works } from '../db/schema';
import { removeFromWatchlist } from './states';
import { deleteUnusedTags, resolveTagIds } from './tags';

export interface WatchlistInput {
	note: string;
	tags: string[];
}

/** Adds a work to the watchlist of an account, or replaces its note and tags when already there. */
export function addToWatchlist(
	db: AppDatabase,
	userId: number,
	workId: number,
	input: WatchlistInput,
	now = new Date()
): void {
	db.transaction((transaction) => {
		const item = transaction
			.insert(watchlistItems)
			.values({ userId, workId, note: input.note, addedAt: now })
			.onConflictDoUpdate({
				target: [watchlistItems.userId, watchlistItems.workId],
				set: { note: input.note }
			})
			.returning({ id: watchlistItems.id })
			.get();
		transaction.delete(watchlistItemTags).where(eq(watchlistItemTags.itemId, item.id)).run();
		const tagIds = resolveTagIds(transaction, userId, 'watchlist', input.tags);
		if (tagIds.length > 0) {
			transaction
				.insert(watchlistItemTags)
				.values(tagIds.map((tagId) => ({ itemId: item.id, tagId })))
				.run();
		}
		deleteUnusedTags(transaction, userId);
	});
}

export function deleteFromWatchlist(db: AppDatabase, userId: number, workId: number): void {
	db.transaction((transaction) => {
		removeFromWatchlist(transaction, userId, workId);
		deleteUnusedTags(transaction, userId);
	});
}

function tagsByItem(db: DatabaseExecutor, itemIds: number[]): Map<number, string[]> {
	const names = new Map<number, string[]>();
	if (itemIds.length === 0) return names;
	const rows = db
		.select({ itemId: watchlistItemTags.itemId, name: tags.name })
		.from(watchlistItemTags)
		.innerJoin(tags, eq(watchlistItemTags.tagId, tags.id))
		.where(inArray(watchlistItemTags.itemId, itemIds))
		.orderBy(tags.name)
		.all();
	for (const row of rows) names.set(row.itemId, [...(names.get(row.itemId) ?? []), row.name]);
	return names;
}

/** The watchlist of an account, most recently added first, optionally limited to one tag. */
export function listWatchlist(db: DatabaseExecutor, userId: number, tag?: string): WatchlistItem[] {
	const rows = db
		.select({ item: watchlistItems, work: works })
		.from(watchlistItems)
		.innerJoin(works, eq(watchlistItems.workId, works.id))
		.where(eq(watchlistItems.userId, userId))
		.orderBy(desc(watchlistItems.addedAt), desc(watchlistItems.id))
		.all();
	const names = tagsByItem(
		db,
		rows.map((row) => row.item.id)
	);
	return rows
		.map(({ item, work }) => ({
			work,
			note: item.note,
			tags: names.get(item.id) ?? [],
			addedAt: item.addedAt
		}))
		.filter((item) => tag === undefined || item.tags.includes(tag));
}

/** The note and tags of a work on the watchlist of an account, when it is there. */
export function findWatchlistItem(
	db: DatabaseExecutor,
	userId: number,
	workId: number
): WatchlistInput | undefined {
	const item = db
		.select()
		.from(watchlistItems)
		.where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.workId, workId)))
		.get();
	if (!item) return undefined;
	return { note: item.note, tags: tagsByItem(db, [item.id]).get(item.id) ?? [] };
}
