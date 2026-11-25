import { TMDB_API_URL } from '$app/env/private';
import { getDatabase } from '../db/index';
import { getInstanceSetting } from '../settings/instance';
import type { TmdbConfig } from './client';
import type { TmdbContext } from './service';

/** Builds the TMDB configuration of the instance for the given key. */
export function tmdbConfig(apiKey: string): TmdbConfig {
	return { baseUrl: TMDB_API_URL.replace(/\/+$/, ''), apiKey };
}

/** Returns what TMDB calls need, or `undefined` while the instance has no TMDB key. */
export function getTmdbContext(): TmdbContext | undefined {
	const db = getDatabase();
	const apiKey = getInstanceSetting(db, 'tmdb_api_key');
	return apiKey ? { db, config: tmdbConfig(apiKey) } : undefined;
}
