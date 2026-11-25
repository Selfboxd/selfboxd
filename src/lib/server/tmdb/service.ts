import * as v from 'valibot';
import type { AppDatabase } from '../db/connection';
import { readCache, writeCache } from './cache';
import { tmdbGet, type TmdbConfig, type TmdbError } from './client';
import type { Film, FilmCollection, FilmSummary } from '../../catalog/film';
import { toCollection, toFilm, toFilmSummary } from './film';
import { collectionSchema, filmDetailsSchema, filmSearchSchema } from './schemas';

export interface TmdbContext {
	db: AppDatabase;
	config: TmdbConfig;
}

export type TmdbFailure = TmdbError | 'invalid_response';

export type Loaded<T> = { ok: true; value: T } | { ok: false; error: TmdbFailure };

const hour = 60 * 60 * 1000;

/** How long each kind of response is kept in the local cache, in milliseconds. */
const lifetimes = {
	film: 24 * hour,
	collection: 7 * 24 * hour,
	search: hour
};

const filmAppendix = 'credits,videos,release_dates,watch/providers';

export const searchQueryMaxLength = 100;

/** Fetches a TMDB resource through the local cache and validates its shape. */
async function load<TSchema extends v.GenericSchema>(
	context: TmdbContext,
	cacheKey: string,
	ttl: number,
	schema: TSchema,
	path: string,
	params: Record<string, string>
): Promise<Loaded<v.InferOutput<TSchema>>> {
	let body = readCache(context.db, cacheKey);
	if (body === undefined) {
		const response = await tmdbGet(context.config, path, params);
		if (!response.ok) return response;
		body = response.data;
		writeCache(context.db, cacheKey, body, ttl);
	}
	const parsed = v.safeParse(schema, body);
	return parsed.success
		? { ok: true, value: parsed.output }
		: { ok: false, error: 'invalid_response' };
}

/** Tells whether TMDB accepts the key of the configuration. */
export async function isTmdbKeyValid(config: TmdbConfig): Promise<boolean> {
	return (await tmdbGet(config, '/configuration')).ok;
}

export async function getFilm(
	context: TmdbContext,
	id: number,
	language: string,
	region: string
): Promise<Loaded<Film>> {
	const result = await load(
		context,
		`film:${String(id)}:${language}`,
		lifetimes.film,
		filmDetailsSchema,
		`/movie/${String(id)}`,
		{ language, append_to_response: filmAppendix }
	);
	return result.ok ? { ok: true, value: toFilm(result.value, region) } : result;
}

export async function getCollection(
	context: TmdbContext,
	id: number,
	language: string
): Promise<Loaded<FilmCollection>> {
	const result = await load(
		context,
		`collection:${String(id)}:${language}`,
		lifetimes.collection,
		collectionSchema,
		`/collection/${String(id)}`,
		{ language }
	);
	return result.ok ? { ok: true, value: toCollection(result.value) } : result;
}

export interface FilmSearch {
	films: FilmSummary[];
	total: number;
}

/** Returns the first page of films matching the query. */
export async function searchFilms(
	context: TmdbContext,
	rawQuery: string,
	language: string
): Promise<Loaded<FilmSearch>> {
	const query = rawQuery.trim().slice(0, searchQueryMaxLength);
	if (!query) return { ok: true, value: { films: [], total: 0 } };

	const result = await load(
		context,
		`search:film:${language}:${query.toLowerCase()}`,
		lifetimes.search,
		filmSearchSchema,
		'/search/movie',
		{ language, query, include_adult: 'false' }
	);
	if (!result.ok) return result;
	return {
		ok: true,
		value: { films: result.value.results.map(toFilmSummary), total: result.value.total_results }
	};
}
