import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyMigrations, openDatabase } from './connection';
import { users } from './schema';

const migrationsFolder = resolve('drizzle');

describe('database connection', () => {
	let directory: string;

	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), 'selfboxd-db-'));
	});

	afterEach(() => {
		rmSync(directory, { recursive: true, force: true });
	});

	it('creates the database file inside a missing directory', () => {
		const db = openDatabase(join(directory, 'nested', 'selfboxd.db'));

		expect(db.get<{ value: number }>(sql`select 1 as value`)).toEqual({ value: 1 });
	});

	it('enforces foreign keys', () => {
		const db = openDatabase(join(directory, 'selfboxd.db'));

		expect(db.get<{ foreign_keys: number }>(sql`pragma foreign_keys`)).toEqual({ foreign_keys: 1 });
	});

	it('applies migrations idempotently', () => {
		const db = openDatabase(join(directory, 'selfboxd.db'));

		applyMigrations(db, migrationsFolder);
		applyMigrations(db, migrationsFolder);

		expect(db.select().from(users).all()).toEqual([]);
	});

	it('rejects duplicate usernames', () => {
		const db = openDatabase(join(directory, 'selfboxd.db'));
		applyMigrations(db, migrationsFolder);
		db.insert(users).values({ username: 'ada', passwordHash: 'hash' }).run();

		expect(() => db.insert(users).values({ username: 'ada', passwordHash: 'hash' }).run()).toThrow(
			/UNIQUE/
		);
	});
});
