import { databaseFile, migrationsDir } from '../paths';
import { applyMigrations, openDatabase, type AppDatabase } from './connection';

let instance: AppDatabase | undefined;

/** Returns the shared database connection, opening and migrating it on first use. */
export function getDatabase(): AppDatabase {
	if (!instance) {
		instance = openDatabase(databaseFile);
		applyMigrations(instance, migrationsDir);
	}
	return instance;
}
