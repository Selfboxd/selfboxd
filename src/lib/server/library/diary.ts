import { and, desc, eq, inArray } from 'drizzle-orm';
import type { DiaryEntry, SeriesStatus } from '../../catalog/library';
import type { AppDatabase, DatabaseExecutor } from '../db/connection';
import { diaryEntries, diaryEntryTags, tags, works } from '../db/schema';
import { removeFromWatchlist, writeState } from './states';
import { deleteUnusedTags, resolveTagIds } from './tags';

export interface DiaryEntryInput {
	watchedOn: string;
	/** Season of a series, or `null` for a film or a whole series. */
	season: number | null;
	/** Where the account stands with a series after this viewing; `null` keeps it unchanged. */
	status: SeriesStatus | null;
	rating: number | null;
	liked: boolean;
	rewatch: boolean;
	review: string;
	containsSpoilers: boolean;
	tags: string[];
}

function replaceEntryTags(db: DatabaseExecutor, userId: number, entryId: number, names: string[]) {
	db.delete(diaryEntryTags).where(eq(diaryEntryTags.entryId, entryId)).run();
	const tagIds = resolveTagIds(db, userId, 'diary', names);
	if (tagIds.length > 0) {
		db.insert(diaryEntryTags)
			.values(tagIds.map((tagId) => ({ entryId, tagId })))
			.run();
	}
	deleteUnusedTags(db, userId);
}

/** Copies the rating and like of an entry to the work, and marks the work as watched. */
function applyEntryToState(
	db: DatabaseExecutor,
	userId: number,
	workId: number,
	input: DiaryEntryInput
) {
	writeState(db, userId, workId, {
		watched: true,
		liked: input.liked,
		...(input.rating === null ? {} : { rating: input.rating }),
		...(input.status === null ? {} : { status: input.status })
	});
	removeFromWatchlist(db, userId, workId);
}

function entryValues(input: DiaryEntryInput) {
	return {
		watchedOn: input.watchedOn,
		season: input.season,
		rating: input.rating,
		liked: input.liked,
		rewatch: input.rewatch,
		review: input.review,
		containsSpoilers: input.containsSpoilers
	};
}

/** Logs a viewing of a work in the diary of an account and returns the new entry identifier. */
export function createDiaryEntry(
	db: AppDatabase,
	userId: number,
	workId: number,
	input: DiaryEntryInput,
	now = new Date()
): number {
	return db.transaction((transaction) => {
		const entry = transaction
			.insert(diaryEntries)
			.values({ userId, workId, ...entryValues(input), createdAt: now })
			.returning({ id: diaryEntries.id })
			.get();
		replaceEntryTags(transaction, userId, entry.id, input.tags);
		applyEntryToState(transaction, userId, workId, input);
		return entry.id;
	});
}

/** Updates an entry of an account. Returns `false` when the account has no such entry. */
export function updateDiaryEntry(
	db: AppDatabase,
	userId: number,
	entryId: number,
	input: DiaryEntryInput
): boolean {
	return db.transaction((transaction) => {
		const [entry] = transaction
			.update(diaryEntries)
			.set({ ...entryValues(input), ...(input.review === '' ? { pinned: false } : {}) })
			.where(and(eq(diaryEntries.id, entryId), eq(diaryEntries.userId, userId)))
			.returning({ workId: diaryEntries.workId })
			.all();
		if (!entry) return false;
		replaceEntryTags(transaction, userId, entryId, input.tags);
		applyEntryToState(transaction, userId, entry.workId, input);
		return true;
	});
}

/** Deletes an entry of an account. Returns `false` when the account has no such entry. */
export function deleteDiaryEntry(db: AppDatabase, userId: number, entryId: number): boolean {
	return db.transaction((transaction) => {
		const result = transaction
			.delete(diaryEntries)
			.where(and(eq(diaryEntries.id, entryId), eq(diaryEntries.userId, userId)))
			.run();
		deleteUnusedTags(transaction, userId);
		return result.changes > 0;
	});
}

function tagsByEntry(db: DatabaseExecutor, entryIds: number[]): Map<number, string[]> {
	const names = new Map<number, string[]>();
	if (entryIds.length === 0) return names;
	const rows = db
		.select({ entryId: diaryEntryTags.entryId, name: tags.name })
		.from(diaryEntryTags)
		.innerJoin(tags, eq(diaryEntryTags.tagId, tags.id))
		.where(inArray(diaryEntryTags.entryId, entryIds))
		.orderBy(tags.name)
		.all();
	for (const row of rows) names.set(row.entryId, [...(names.get(row.entryId) ?? []), row.name]);
	return names;
}

type EntryRow = { entry: typeof diaryEntries.$inferSelect; work: typeof works.$inferSelect };

function toEntries(db: DatabaseExecutor, rows: EntryRow[]): DiaryEntry[] {
	const names = tagsByEntry(
		db,
		rows.map((row) => row.entry.id)
	);
	return rows.map(({ entry, work }) => ({
		id: entry.id,
		work,
		watchedOn: entry.watchedOn,
		season: entry.season,
		rating: entry.rating,
		liked: entry.liked,
		rewatch: entry.rewatch,
		review: entry.review,
		containsSpoilers: entry.containsSpoilers,
		pinned: entry.pinned,
		tags: names.get(entry.id) ?? []
	}));
}

/** Diary entries of an account, most recent viewing first, optionally for one work. */
export function listDiaryEntries(
	db: DatabaseExecutor,
	userId: number,
	workId?: number
): DiaryEntry[] {
	const ofUser = eq(diaryEntries.userId, userId);
	const rows = db
		.select({ entry: diaryEntries, work: works })
		.from(diaryEntries)
		.innerJoin(works, eq(diaryEntries.workId, works.id))
		.where(workId === undefined ? ofUser : and(ofUser, eq(diaryEntries.workId, workId)))
		.orderBy(desc(diaryEntries.watchedOn), desc(diaryEntries.id))
		.all();
	return toEntries(db, rows);
}

/** One diary entry of an account, or `undefined` when the account has no such entry. */
export function getDiaryEntry(
	db: DatabaseExecutor,
	userId: number,
	entryId: number
): DiaryEntry | undefined {
	const rows = db
		.select({ entry: diaryEntries, work: works })
		.from(diaryEntries)
		.innerJoin(works, eq(diaryEntries.workId, works.id))
		.where(and(eq(diaryEntries.id, entryId), eq(diaryEntries.userId, userId)))
		.all();
	return toEntries(db, rows)[0];
}
