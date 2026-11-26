import { and, eq } from 'drizzle-orm';
import type { ListTarget } from '../../catalog/list-view';
import type { AppDatabase, DatabaseExecutor } from '../db/connection';
import { sharedLists } from '../db/schema';
import { createShare, deleteShare, updateShare, type ShareRequest } from './platform';

/** Most works a shared list holds, as the platform accepts. */
export const shareItemMax = 1_000;

function key(target: ListTarget) {
	if ('personal' in target)
		return { source: 'personal' as const, reference: String(target.personal) };
	if ('public' in target) return { source: 'public' as const, reference: String(target.public) };
	return { source: 'chart' as const, reference: target.chart };
}

function find(db: DatabaseExecutor, userId: number, target: ListTarget) {
	const { source, reference } = key(target);
	return db
		.select()
		.from(sharedLists)
		.where(
			and(
				eq(sharedLists.userId, userId),
				eq(sharedLists.source, source),
				eq(sharedLists.reference, reference)
			)
		)
		.get();
}

/** Address of a list the account shared, or `null` when it is not shared. */
export function sharedUrl(db: DatabaseExecutor, userId: number, target: ListTarget): string | null {
	return find(db, userId, target)?.url ?? null;
}

export type ShareOutcome = { ok: true; url: string } | { ok: false; error: string };

/**
 * Shares a list on the platform, or updates the list already shared, which keeps its address.
 * Only TMDB identifiers leave the instance, with the name, description and notes of the list.
 */
export async function shareList(
	db: AppDatabase,
	userId: number,
	target: ListTarget,
	list: ShareRequest
): Promise<ShareOutcome> {
	const request = { ...list, items: list.items.slice(0, shareItemMax) };
	const known = find(db, userId, target);
	if (known) {
		const updated = await updateShare(known.code, known.manageToken, request);
		if (updated.ok) {
			db.update(sharedLists)
				.set({ sharedAt: new Date() })
				.where(eq(sharedLists.id, known.id))
				.run();
			return { ok: true, url: known.url };
		}
		if (updated.status !== 404) return { ok: false, error: updated.error };
		db.delete(sharedLists).where(eq(sharedLists.id, known.id)).run();
	}
	const created = await createShare(request);
	if (!created.ok) return { ok: false, error: created.error };
	const body = created.body as { code?: unknown; url?: unknown; manageToken?: unknown } | null;
	if (
		typeof body?.code !== 'string' ||
		typeof body.url !== 'string' ||
		typeof body.manageToken !== 'string'
	) {
		return { ok: false, error: 'platform_error' };
	}
	db.insert(sharedLists)
		.values({
			userId,
			...key(target),
			url: body.url,
			code: body.code,
			manageToken: body.manageToken,
			sharedAt: new Date()
		})
		.run();
	return { ok: true, url: body.url };
}

/** Deletes a shared list from the platform and forgets it. */
export async function stopSharing(
	db: AppDatabase,
	userId: number,
	target: ListTarget
): Promise<{ ok: true } | { ok: false; error: string }> {
	const known = find(db, userId, target);
	if (!known) return { ok: true };
	const deleted = await deleteShare(known.code, known.manageToken);
	if (!deleted.ok && deleted.status !== 404) return { ok: false, error: deleted.error };
	db.delete(sharedLists).where(eq(sharedLists.id, known.id)).run();
	return { ok: true };
}
