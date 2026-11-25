import { and, desc, eq } from 'drizzle-orm';
import * as v from 'valibot';
import { isChart } from '../../catalog/charts';
import { likedListPreviewSize, type LikedList, type ListTarget } from '../../catalog/list-view';
import type { DatabaseExecutor } from '../db/connection';
import { likedLists } from '../db/schema';

type Source = (typeof likedLists.$inferInsert)['source'];

const previewSchema = v.array(
	v.object({
		id: v.number(),
		kind: v.picklist(['film', 'series']),
		title: v.string(),
		year: v.nullable(v.number()),
		posterPath: v.nullable(v.string())
	})
);

function key(target: ListTarget): { source: Source; reference: string } {
	if ('personal' in target) return { source: 'personal', reference: String(target.personal) };
	if ('public' in target) return { source: 'public', reference: String(target.public) };
	return { source: 'chart', reference: target.chart };
}

function toTarget(source: Source, reference: string): ListTarget | undefined {
	if (source === 'chart') return isChart(reference) ? { chart: reference } : undefined;
	const id = Number(reference);
	if (!Number.isInteger(id)) return undefined;
	return source === 'personal' ? { personal: id } : { public: id };
}

function where(userId: number, target: ListTarget) {
	const { source, reference } = key(target);
	return and(
		eq(likedLists.userId, userId),
		eq(likedLists.source, source),
		eq(likedLists.reference, reference)
	);
}

export function isListLiked(db: DatabaseExecutor, userId: number, target: ListTarget): boolean {
	return (
		db.select({ id: likedLists.id }).from(likedLists).where(where(userId, target)).get() !==
		undefined
	);
}

/** Likes a list, keeping what is needed to show it, or unlikes it. */
export function setListLiked(
	db: DatabaseExecutor,
	userId: number,
	list: LikedList,
	liked: boolean,
	now = new Date()
): void {
	if (!liked) {
		db.delete(likedLists).where(where(userId, list.target)).run();
		return;
	}
	const values = {
		name: list.name,
		owner: list.owner,
		itemCount: list.itemCount,
		preview: JSON.stringify(list.preview.slice(0, likedListPreviewSize))
	};
	db.insert(likedLists)
		.values({ userId, ...key(list.target), ...values, likedAt: now })
		.onConflictDoUpdate({
			target: [likedLists.userId, likedLists.source, likedLists.reference],
			set: values
		})
		.run();
}

/** Lists an account likes, most recently liked first. */
export function listLikedLists(db: DatabaseExecutor, userId: number): LikedList[] {
	const rows = db
		.select()
		.from(likedLists)
		.where(eq(likedLists.userId, userId))
		.orderBy(desc(likedLists.likedAt), desc(likedLists.id))
		.all();
	return rows.flatMap((row) => {
		const target = toTarget(row.source, row.reference);
		if (!target) return [];
		let raw: unknown;
		try {
			raw = JSON.parse(row.preview);
		} catch {
			raw = [];
		}
		const preview = v.safeParse(previewSchema, raw);
		return [
			{
				target,
				name: row.name,
				owner: row.owner,
				itemCount: row.itemCount,
				preview: preview.success ? preview.output : []
			}
		];
	});
}

/** Forgets every like of a list of an account, when the list is deleted. */
export function forgetListLikes(db: DatabaseExecutor, listId: number): void {
	db.delete(likedLists)
		.where(and(eq(likedLists.source, 'personal'), eq(likedLists.reference, String(listId))))
		.run();
}
