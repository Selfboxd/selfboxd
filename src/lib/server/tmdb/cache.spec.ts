import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiCache } from '../db/schema';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import { readCache, writeCache } from './cache';

const start = new Date('2026-01-01T00:00:00Z');
const hour = 60 * 60 * 1000;

function after(milliseconds: number): Date {
	return new Date(start.getTime() + milliseconds);
}

describe('API cache', () => {
	let database: TestDatabase;

	beforeEach(() => {
		database = createTestDatabase();
	});

	afterEach(() => {
		database.cleanup();
	});

	it('returns nothing for an unknown key', () => {
		expect(readCache(database.db, 'film:78', start)).toBeUndefined();
	});

	it('returns a stored body until it expires', () => {
		writeCache(database.db, 'film:78', { title: 'Blade Runner' }, hour, start);

		expect(readCache(database.db, 'film:78', after(hour - 1))).toEqual({ title: 'Blade Runner' });
		expect(readCache(database.db, 'film:78', after(hour))).toBeUndefined();
	});

	it('replaces the body stored under the same key', () => {
		writeCache(database.db, 'film:78', { version: 1 }, hour, start);
		writeCache(database.db, 'film:78', { version: 2 }, hour, start);

		expect(readCache(database.db, 'film:78', start)).toEqual({ version: 2 });
	});

	it('drops expired entries when writing', () => {
		writeCache(database.db, 'film:78', {}, hour, start);

		writeCache(database.db, 'film:79', {}, hour, after(2 * hour));

		expect(
			database.db
				.select()
				.from(apiCache)
				.all()
				.map((row) => row.key)
		).toEqual(['film:79']);
	});
});
