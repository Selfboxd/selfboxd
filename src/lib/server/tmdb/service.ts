import * as v from 'valibot';
import { chartPageMax, type Chart, type ChartPage } from '../../catalog/charts';
import type { AppDatabase } from '../db/connection';
import { readCache, writeCache } from './cache';
import { tmdbGet, type TmdbConfig, type TmdbError } from './client';
import type { Film, FilmCollection, FilmSearchResult, FilmSummary } from '../../catalog/film';
import { toCollection, toFilm, toFilmSummary, yearOf } from './film';
import { browsePageMax, type BrowseFilter, type Genre } from '../../catalog/browse';
import { discoverParams } from './browse';
import type { Series, SeriesSummary } from '../../catalog/series';
import type { WorkKind } from '../../catalog/library';
import type { WorkSearch, WorkSearchResult } from '../../catalog/search';
import { toSeries, toSeriesSummary } from './series';
import {
	collectionSchema,
	filmDetailsSchema,
	filmListSchema,
	filmPageSchema,
	filmSearchSchema,
	genreListSchema,
	seriesDetailsSchema,
	seriesListSchema,
	seriesPageSchema,
	multiSearchSchema
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

const filmAppendix = 'credits,videos,release_dates,watch/providers,alternative_titles';

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
				directors: details.ok ? details.value.directors : [],
				alternativeTitles: details.ok ? details.value.alternativeTitles : []
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
	/** Number of works matching, on every page. */
	total: number;
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
			totalPages: Math.min(result.value.total_pages, browsePageMax),
			total: result.value.total_results
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

export async function getSeries(
	context: TmdbContext,
	id: number,
	language: string,
	region: string
): Promise<Loaded<Series>> {
	const result = await load(
		context,
		`series:${String(id)}:${language}`,
		lifetimes.film,
		seriesDetailsSchema,
		`/tv/${String(id)}`,
		{ language, append_to_response: 'credits,videos,watch/providers,alternative_titles' }
	);
	return result.ok ? { ok: true, value: toSeries(result.value, region) } : result;
}

/** Returns the series that are the most popular this week. */
export async function getPopularSeries(
	context: TmdbContext,
	language: string
): Promise<Loaded<SeriesSummary[]>> {
	const result = await load(
		context,
		`popular:series:${language}`,
		lifetimes.popular,
		seriesListSchema,
		'/trending/tv/week',
		{ language }
	);
	if (!result.ok) return result;
	return { ok: true, value: result.value.results.map(toSeriesSummary) };
}

/** Returns the series genres, named in the given language. */
export async function getSeriesGenres(
	context: TmdbContext,
	language: string
): Promise<Loaded<Genre[]>> {
	const result = await load(
		context,
		`genres:series:${language}`,
		lifetimes.genres,
		genreListSchema,
		'/genre/tv/list',
		{ language }
	);
	if (!result.ok) return result;
	return { ok: true, value: result.value.genres };
}

/** Returns one page of the series matching a browse filter. */
export async function browseSeries(
	context: TmdbContext,
	filter: BrowseFilter,
	language: string
): Promise<Loaded<FilmPage>> {
	const params = { language, ...discoverParams(filter, new Date(), 'series') };
	const key = Object.entries(params)
		.map(([name, value]) => `${name}=${value}`)
		.join('&');
	const result = await load(
		context,
		`browse:series:${key}`,
		lifetimes.popular,
		seriesPageSchema,
		'/discover/tv',
		params
	);
	if (!result.ok) return result;
	return {
		ok: true,
		value: {
			films: result.value.results.map(toSeriesSummary),
			page: result.value.page,
			totalPages: Math.min(result.value.total_pages, browsePageMax),
			total: result.value.total_results
		}
	};
}

/** Directors or creators and other titles of a film or a series found by a search. */
async function searchDetails(
	context: TmdbContext,
	kind: WorkKind,
	id: number,
	language: string
): Promise<Pick<WorkSearchResult, 'people' | 'alternativeTitles'>> {
	if (kind === 'series') {
		const details = await getSeries(context, id, language, '');
		return details.ok
			? { people: details.value.creators, alternativeTitles: details.value.alternativeTitles }
			: { people: [], alternativeTitles: [] };
	}
	const details = await getFilm(context, id, language, '');
	return details.ok
		? { people: details.value.directors, alternativeTitles: details.value.alternativeTitles }
		: { people: [], alternativeTitles: [] };
}

/** What a search covers: films and series together, or one kind. */
export type SearchScope = 'all' | WorkKind;

const emptySearch: WorkSearch = { results: [], total: 0, page: 1, totalPages: 0 };

/**
 * Returns one page of the films and series matching the query, most relevant first,
 * each with its directors or creators and its other titles.
 */
export async function searchWorks(
	context: TmdbContext,
	rawQuery: string,
	language: string,
	page = 1,
	scope: SearchScope = 'all'
): Promise<Loaded<WorkSearch>> {
	const query = rawQuery.trim().slice(0, searchQueryMaxLength);
	if (!query) return { ok: true, value: emptySearch };

	if (scope === 'film') {
		const films = await searchFilms(context, query, language, page);
		if (!films.ok) return films;
		const { films: found, ...pages } = films.value;
		return {
			ok: true,
			value: {
				...pages,
				results: found.map(({ directors, ...film }) => ({
					...film,
					kind: 'film',
					people: directors
				}))
			}
		};
	}

	const multi = scope === 'all';
	const result = await load(
		context,
		`search:${multi ? 'multi' : 'tv'}:${language}:${String(page)}:${query.toLowerCase()}`,
		lifetimes.search,
		multiSearchSchema,
		multi ? '/search/multi' : '/search/tv',
		{ language, query, page: String(page), include_adult: 'false' }
	);
	if (!result.ok) return result;

	const works = result.value.results.flatMap((entry) => {
		const type = multi ? entry.media_type : 'tv';
		if (type !== 'movie' && type !== 'tv') return [];
		const kind: WorkKind = type === 'tv' ? 'series' : 'film';
		const title = (kind === 'film' ? entry.title : entry.name) ?? '';
		return [
			{
				kind,
				id: entry.id,
				title,
				originalTitle: (kind === 'film' ? entry.original_title : entry.original_name) ?? title,
				year: yearOf(kind === 'film' ? entry.release_date : entry.first_air_date),
				posterPath: entry.poster_path ?? null
			}
		];
	});
	const results = await Promise.all(
		works.map(async (work) => ({
			...work,
			...(await searchDetails(context, work.kind, work.id, language))
		}))
	);
	return {
		ok: true,
		value: {
			results,
			total: result.value.total_results,
			page: result.value.page,
			totalPages: Math.min(result.value.total_pages, searchPageMax)
		}
	};
}
