import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

export type AppDatabase = BetterSQLite3Database<typeof schema>;

/** Opens the SQLite database at `file`, creating the file and its directory when missing. */
export function openDatabase(file: string): AppDatabase {
	mkdirSync(dirname(file), { recursive: true });
	const client = new Database(file);
	client.pragma('journal_mode = WAL');
	client.pragma('foreign_keys = ON');
	return drizzle(client, { schema });
}

/** Applies every migration in `migrationsFolder` that the database has not recorded yet. */
export function applyMigrations(db: AppDatabase, migrationsFolder: string): void {
	migrate(db, { migrationsFolder });
}
