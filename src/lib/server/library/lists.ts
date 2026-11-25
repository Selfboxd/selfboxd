import { and, asc, count, desc, eq, inArray, max } from 'drizzle-orm';
import { listPreviewSize, type ListSummary, type WorkList } from '../../catalog/library';
import type { AppDatabase, DatabaseExecutor } from '../db/connection';
import { listItems, lists, works } from '../db/schema';

export interface ListInput {
	name: string;
	description: string;
	ranked: boolean;
}

function ownedList(db: DatabaseExecutor, userId: number, listId: number) {
	return db
		.select()
		.from(lists)
		.where(and(eq(lists.id, listId), eq(lists.userId, userId)))
		.get();
}

function touch(db: DatabaseExecutor, listId: number, now: Date): void {
	db.update(lists).set({ updatedAt: now }).where(eq(lists.id, listId)).run();
}

export function createList(
	db: DatabaseExecutor,
	userId: number,
	input: ListInput,
	now = new Date()
): number {
	return db
		.insert(lists)
		.values({ userId, ...input, createdAt: now, updatedAt: now })
		.returning({ id: lists.id })
		.get().id;
}

/** Changes the name, description and ranking of a list. Returns whether the list was found. */
export function updateList(
	db: DatabaseExecutor,
	userId: number,
	listId: number,
	input: ListInput,
	now = new Date()
): boolean {
	const result = db
		.update(lists)
		.set({ ...input, updatedAt: now })
		.where(and(eq(lists.id, listId), eq(lists.userId, userId)))
		.run();
	return result.changes > 0;
}

export function deleteList(db: DatabaseExecutor, userId: number, listId: number): boolean {
	const result = db
		.delete(lists)
		.where(and(eq(lists.id, listId), eq(lists.userId, userId)))
		.run();
	return result.changes > 0;
}

/** Lists of an account, most recently changed first, each with its first works. */
export function listLists(db: DatabaseExecutor, userId: number): ListSummary[] {
	const rows = db
		.select()
		.from(lists)
		.where(eq(lists.userId, userId))
		.orderBy(desc(lists.updatedAt), desc(lists.id))
		.all();
	return rows.map((list) => {
		const total = db
			.select({ value: count() })
			.from(listItems)
			.where(eq(listItems.listId, list.id))
			.get();
		const preview = db
			.select({ work: works })
			.from(listItems)
			.innerJoin(works, eq(listItems.workId, works.id))
			.where(eq(listItems.listId, list.id))
			.orderBy(asc(listItems.position))
			.limit(listPreviewSize)
			.all();
		return {
			id: list.id,
			name: list.name,
			description: list.description,
			ranked: list.ranked,
			count: total?.value ?? 0,
			preview: preview.map((row) => row.work)
		};
	});
}

/** A list of an account with its works in order, when it exists. */
export function getList(
	db: DatabaseExecutor,
	userId: number,
	listId: number
): WorkList | undefined {
	const list = ownedList(db, userId, listId);
	if (!list) return undefined;
	const items = db
		.select({ work: works, note: listItems.note })
		.from(listItems)
		.innerJoin(works, eq(listItems.workId, works.id))
		.where(eq(listItems.listId, listId))
		.orderBy(asc(listItems.position))
		.all();
	return {
		id: list.id,
		name: list.name,
		description: list.description,
		ranked: list.ranked,
		updatedAt: list.updatedAt.toISOString(),
		items
	};
}

/** Identifiers of the lists of an account that hold a work. */
export function listMembership(db: DatabaseExecutor, userId: number, workId: number): number[] {
	return db
		.select({ id: lists.id })
		.from(listItems)
		.innerJoin(lists, eq(listItems.listId, lists.id))
		.where(and(eq(lists.userId, userId), eq(listItems.workId, workId)))
		.all()
		.map((row) => row.id);
}

/**
 * Puts a work in exactly the given lists of an account: it is appended to the lists
 * it was missing from and removed from the others. Lists of other accounts are ignored.
 */
export function setMembership(
	db: AppDatabase,
	userId: number,
	workId: number,
	listIds: number[],
	now = new Date()
): void {
	db.transaction((transaction) => {
		const owned = transaction
			.select({ id: lists.id })
			.from(lists)
			.where(eq(lists.userId, userId))
			.all()
			.map((row) => row.id);
		const current = new Set(listMembership(transaction, userId, workId));
		const wanted = new Set(listIds.filter((id) => owned.includes(id)));

		for (const listId of wanted) {
			if (current.has(listId)) continue;
			const last = transaction
				.select({ value: max(listItems.position) })
				.from(listItems)
				.where(eq(listItems.listId, listId))
				.get();
			transaction
				.insert(listItems)
				.values({ listId, workId, position: (last?.value ?? 0) + 1 })
				.run();
			touch(transaction, listId, now);
		}

		const removed = [...current].filter((id) => !wanted.has(id));
		if (removed.length > 0) {
			transaction
				.delete(listItems)
				.where(and(inArray(listItems.listId, removed), eq(listItems.workId, workId)))
				.run();
			for (const listId of removed) touch(transaction, listId, now);
		}
	});
}

/** Removes a work from a list of an account. Returns whether something was removed. */
export function removeListItem(
	db: AppDatabase,
	userId: number,
	listId: number,
	workId: number,
	now = new Date()
): boolean {
	return db.transaction((transaction) => {
		if (!ownedList(transaction, userId, listId)) return false;
		const result = transaction
			.delete(listItems)
			.where(and(eq(listItems.listId, listId), eq(listItems.workId, workId)))
			.run();
		if (result.changes > 0) touch(transaction, listId, now);
		return result.changes > 0;
	});
}

/**
 * Puts the works of a list of an account in the given order.
 * The order must name every work of the list exactly once. Returns whether it was applied.
 */
export function reorderList(
	db: AppDatabase,
	userId: number,
	listId: number,
	workIds: number[],
	now = new Date()
): boolean {
	return db.transaction((transaction) => {
		if (!ownedList(transaction, userId, listId)) return false;
		const current = transaction
			.select({ workId: listItems.workId })
			.from(listItems)
			.where(eq(listItems.listId, listId))
			.all()
			.map((item) => item.workId);
		const wanted = new Set(workIds);
		if (wanted.size !== workIds.length || workIds.length !== current.length) return false;
		if (!current.every((workId) => wanted.has(workId))) return false;

		workIds.forEach((workId, index) => {
			transaction
				.update(listItems)
				.set({ position: index + 1 })
				.where(and(eq(listItems.listId, listId), eq(listItems.workId, workId)))
				.run();
		});
		touch(transaction, listId, now);
		return true;
	});
}

/** Sets the note of a work in a list of an account. Returns whether the work was found. */
export function setListItemNote(
	db: AppDatabase,
	userId: number,
	listId: number,
	workId: number,
	note: string
): boolean {
	return db.transaction((transaction) => {
		if (!ownedList(transaction, userId, listId)) return false;
		const result = transaction
			.update(listItems)
			.set({ note })
			.where(and(eq(listItems.listId, listId), eq(listItems.workId, workId)))
			.run();
		return result.changes > 0;
	});
}

/**
 * Creates a list of an account holding the given works in order, each once,
 * and returns its identifier.
 */
export function createListWithWorks(
	db: AppDatabase,
	userId: number,
	input: ListInput,
	workIds: number[],
	now = new Date()
): number {
	return db.transaction((transaction) => {
		const listId = createList(transaction, userId, input, now);
		const unique = [...new Set(workIds)];
		if (unique.length > 0) {
			transaction
				.insert(listItems)
				.values(unique.map((workId, index) => ({ listId, workId, position: index + 1 })))
				.run();
		}
		return listId;
	});
}
