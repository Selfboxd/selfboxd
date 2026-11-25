import { MDBLIST_API_URL } from '$app/env/private';
import { getDatabase } from '../db/index';
import { getInstanceSetting } from '../settings/instance';
import { getTmdbContext } from '../tmdb/index';
import { requestLanguage } from '../tmdb/page';
import type { MdblistConfig } from './client';
import type { MdblistContext } from './service';

/** Builds the MDBList configuration of the instance for the given key. */
export function mdblistConfig(apiKey: string): MdblistConfig {
	return { baseUrl: MDBLIST_API_URL.replace(/\/+$/, ''), apiKey };
}

/** Returns what MDBList calls need, or `undefined` while the instance has no MDBList key. */
export function getMdblistContext(): MdblistContext | undefined {
	const db = getDatabase();
	const apiKey = getInstanceSetting(db, 'mdblist_api_key');
	if (!apiKey) return undefined;
	return { db, config: mdblistConfig(apiKey), tmdb: getTmdbContext(), language: requestLanguage() };
}
