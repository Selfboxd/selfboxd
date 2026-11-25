import { join, resolve } from 'node:path';
import { DATA_DIR } from '$app/env/private';

/** Absolute path of the single directory that holds all instance data. */
export const dataDir = resolve(DATA_DIR);

/** Absolute path of the SQLite database file. */
export const databaseFile = join(dataDir, 'selfboxd.db');

/** Absolute path of the directory holding the profile pictures. */
export const avatarsDir = join(dataDir, 'avatars');

/** Absolute path of the directory containing the SQL migration files. */
export const migrationsDir = resolve('drizzle');
