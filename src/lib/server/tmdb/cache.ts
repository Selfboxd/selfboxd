import { eq, lte } from 'drizzle-orm';
import type { AppDatabase } from '../db/connection';
import { apiCache } from '../db/schema';

/** Returns the cached body stored under `key`, unless it is missing or expired. */
export function readCache(db: AppDatabase, key: string, now = new Date()): unknown {
	const row = db.select().from(apiCache).where(eq(apiCache.key, key)).get();
	if (!row || row.expiresAt.getTime() <= now.getTime()) return undefined;
	return JSON.parse(row.body) as unknown;
}

/** Stores a body under `key` for `ttl` milliseconds and drops the expired entries. */
export function writeCache(
	db: AppDatabase,
	key: string,
	body: unknown,
	ttl: number,
	now = new Date()
) {
	const values = { body: JSON.stringify(body), expiresAt: new Date(now.getTime() + ttl) };
	db.delete(apiCache).where(lte(apiCache.expiresAt, now)).run();
	db.insert(apiCache)
		.values({ key, ...values })
		.onConflictDoUpdate({ target: apiCache.key, set: values })
		.run();
}
