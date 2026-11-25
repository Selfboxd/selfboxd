import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { applyMigrations, openDatabase, type AppDatabase } from '../db/connection';

export interface TestDatabase {
	db: AppDatabase;
	/** Deletes the temporary directory that holds the database. */
	cleanup: () => void;
}

/** Creates a migrated database inside a new temporary directory. */
export function createTestDatabase(): TestDatabase {
	const directory = mkdtempSync(join(tmpdir(), 'selfboxd-test-'));
	const db = openDatabase(join(directory, 'selfboxd.db'));
	applyMigrations(db, resolve('drizzle'));
	return {
		db,
		cleanup: () => {
			rmSync(directory, { recursive: true, force: true });
		}
	};
}
