import * as v from 'valibot';
import { chartPageMax, type Chart, type ChartPage } from '../../catalog/charts';
import type { AppDatabase } from '../db/connection';
import { readCache, writeCache } from './cache';
import { tmdbGet, type TmdbConfig, type TmdbError } from './client';
import type { Film, FilmCollection, FilmSearchResult, FilmSummary } from '../../catalog/film';
import { toCollection, toFilm, toFilmSummary } from './film';
import { browsePageMax, type BrowseFilter, type Genre } from '../../catalog/browse';
import { discoverParams } from './browse';
import {
	collectionSchema,
	filmDetailsSchema,
	filmListSchema,
	filmPageSchema,
	filmSearchSchema,
	genreListSchema
} from './schemas';

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
	search: hour,
	popular: 6 * hour,
	genres: 7 * 24 * hour
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
	films: FilmSearchResult[];
	total: number;
	page: number;
	totalPages: number;
}

/** Highest page of search results TMDB serves. */
export const searchPageMax = 500;

/**
 * Returns one page of films matching the query, each with its directors.
 * A film whose details cannot be loaded is listed without directors.
 */
export async function searchFilms(
	context: TmdbContext,
	rawQuery: string,
	language: string,
	page = 1
): Promise<Loaded<FilmSearch>> {
	const query = rawQuery.trim().slice(0, searchQueryMaxLength);
	if (!query) return { ok: true, value: { films: [], total: 0, page: 1, totalPages: 0 } };

	const result = await load(
		context,
		`search:film:${language}:${String(page)}:${query.toLowerCase()}`,
		lifetimes.search,
		filmSearchSchema,
		'/search/movie',
		{ language, query, page: String(page), include_adult: 'false' }
	);
	if (!result.ok) return result;

	const films = await Promise.all(
		result.value.results.map(async (entry) => {
			const details = await getFilm(context, entry.id, language, '');
			return {
				...toFilmSummary(entry),
				originalTitle: entry.original_title,
				directors: details.ok ? details.value.directors : []
			};
		})
	);
	return {
		ok: true,
		value: {
			films,
			total: result.value.total_results,
			page: result.value.page,
			totalPages: Math.min(result.value.total_pages, searchPageMax)
		}
	};
}

/** Returns the films that are the most popular this week. */
export async function getPopularFilms(
	context: TmdbContext,
	language: string
): Promise<Loaded<FilmSummary[]>> {
	const result = await load(
		context,
		`popular:film:${language}`,
		lifetimes.popular,
		filmListSchema,
		'/trending/movie/week',
		{ language }
	);
	if (!result.ok) return result;
	return { ok: true, value: result.value.results.map(toFilmSummary) };
}

/** Returns the film genres, named in the given language. */
export async function getGenres(context: TmdbContext, language: string): Promise<Loaded<Genre[]>> {
	const result = await load(
		context,
		`genres:film:${language}`,
		lifetimes.genres,
		genreListSchema,
		'/genre/movie/list',
		{ language }
	);
	if (!result.ok) return result;
	return { ok: true, value: result.value.genres };
}

export interface FilmPage {
	films: FilmSummary[];
	page: number;
	totalPages: number;
}

/** Returns one page of the films matching a browse filter. */
export async function browseFilms(
	context: TmdbContext,
	filter: BrowseFilter,
	language: string
): Promise<Loaded<FilmPage>> {
	const params = { language, ...discoverParams(filter) };
	const key = Object.entries(params)
		.map(([name, value]) => `${name}=${value}`)
		.join('&');
	const result = await load(
		context,
		`browse:film:${key}`,
		lifetimes.popular,
		filmPageSchema,
		'/discover/movie',
		params
	);
	if (!result.ok) return result;
	return {
		ok: true,
		value: {
			films: result.value.results.map(toFilmSummary),
			page: result.value.page,
			totalPages: Math.min(result.value.total_pages, browsePageMax)
		}
	};
}

const chartPaths: Record<Chart, string> = {
	popular: '/movie/popular',
	'top-rated': '/movie/top_rated',
	'now-playing': '/movie/now_playing',
	upcoming: '/movie/upcoming'
};

/** Returns one page of a film chart of TMDB. */
export async function getChart(
	context: TmdbContext,
	chart: Chart,
	language: string,
	page = 1
): Promise<Loaded<ChartPage>> {
	const result = await load(
		context,
		`chart:${chart}:${language}:${String(page)}`,
		lifetimes.popular,
		filmPageSchema,
		chartPaths[chart],
		{ language, page: String(page) }
	);
	if (!result.ok) return result;
	return {
		ok: true,
		value: {
			films: result.value.results.map(toFilmSummary),
			backdropPath: result.value.results.find((film) => film.backdrop_path)?.backdrop_path ?? null,
			page: result.value.page,
			totalPages: Math.min(result.value.total_pages, chartPageMax)
		}
	};
}
