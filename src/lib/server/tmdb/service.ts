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
import type { SearchResult, WorkSearch, WorkSearchResult } from '../../catalog/search';
import { toSeries, toSeriesSummary } from './series';
import type { PersonDetails } from '../../catalog/person';
import type { CompanyKind, Studio } from '../../catalog/studio';
import type { Region, Service } from '../../catalog/streaming';
import { toPerson, toStudio } from './person';
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
	multiSearchSchema,
	personSchema,
	companySchema,
	regionListSchema,
	providerListSchema
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
	genres: 7 * 24 * hour,
	company: 7 * 24 * hour
};

/** Parts appended to the details of a film or a series; also part of their cache keys. */
const filmAppendix = 'credits,videos,release_dates,watch/providers,alternative_titles';
const seriesAppendix = 'credits,videos,watch/providers,alternative_titles';

export const searchQueryMaxLength = 100;

/** Language of the texts used when TMDB has none in the language of the user. */
const fallbackLanguage = 'en-US';

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
		`film:${String(id)}:${language}:${filmAppendix}`,
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

/** Narrows a browse to the works of a production company or of a television network. */
export interface BrowseScope {
	studio?: number;
	network?: number;
	/** A watch provider the works must stream on, in a country. */
	service?: { id: number; region: string };
}

function scopeParams(scope: BrowseScope): Record<string, string> {
	const params: Record<string, string> = {};
	if (scope.studio !== undefined) params.with_companies = String(scope.studio);
	if (scope.network !== undefined) params.with_networks = String(scope.network);
	if (scope.service !== undefined) {
		params.with_watch_providers = String(scope.service.id);
		params.watch_region = scope.service.region;
		params.with_watch_monetization_types = 'flatrate';
	}
	return params;
}

/** Returns one page of the films matching a browse filter. */
export async function browseFilms(
	context: TmdbContext,
	filter: BrowseFilter,
	language: string,
	scope: BrowseScope = {}
): Promise<Loaded<FilmPage>> {
	const params = { language, ...discoverParams(filter), ...scopeParams(scope) };
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
		`series:${String(id)}:${language}:${seriesAppendix}`,
		lifetimes.film,
		seriesDetailsSchema,
		`/tv/${String(id)}`,
		{ language, append_to_response: seriesAppendix }
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
	language: string,
	scope: BrowseScope = {}
): Promise<Loaded<FilmPage>> {
	const params = {
		language,
		...discoverParams(filter, new Date(), 'series'),
		...scopeParams(scope)
	};
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

/** What a search covers: films, series and people together, one kind of work, or people. */
export type SearchScope = 'all' | WorkKind | 'person';

const searchPaths: Record<Exclude<SearchScope, 'film'>, string> = {
	all: '/search/multi',
	series: '/search/tv',
	person: '/search/person'
};

const searchTypes: Record<Exclude<SearchScope, 'film'>, string | null> = {
	all: null,
	series: 'tv',
	person: 'person'
};

/** A search result before the details of its work are loaded. */
type SearchEntry =
	Exclude<SearchResult, WorkSearchResult> | Omit<WorkSearchResult, 'people' | 'alternativeTitles'>;

const emptySearch: WorkSearch = { results: [], total: 0, page: 1, totalPages: 0 };

/**
 * Returns one page of the films, series and people matching the query, most relevant first,
 * each work with its directors or creators and its other titles.
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

	const result = await load(
		context,
		`search:${scope}:${language}:${String(page)}:${query.toLowerCase()}`,
		lifetimes.search,
		multiSearchSchema,
		searchPaths[scope],
		{ language, query, page: String(page), include_adult: 'false' }
	);
	if (!result.ok) return result;

	const found = result.value.results.flatMap((entry): SearchEntry[] => {
		const type = searchTypes[scope] ?? entry.media_type;
		if (type === 'person') {
			return [
				{
					kind: 'person',
					id: entry.id,
					name: entry.name ?? '',
					profilePath: entry.profile_path ?? null,
					department: entry.known_for_department ?? '',
					knownFor: entry.known_for.flatMap((work) => {
						const title = work.title ?? work.name;
						return title ? [title] : [];
					})
				}
			];
		}
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
		found.map(async (entry): Promise<SearchResult> =>
			entry.kind === 'person'
				? entry
				: { ...entry, ...(await searchDetails(context, entry.kind, entry.id, language)) }
		)
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

/** Returns a person with the films and series they are credited on. */
export async function getPerson(
	context: TmdbContext,
	id: number,
	language: string
): Promise<Loaded<PersonDetails>> {
	const path = `/person/${String(id)}`;
	const result = await load(
		context,
		`person:${String(id)}:${language}:combined_credits`,
		lifetimes.film,
		personSchema,
		path,
		{ language, append_to_response: 'combined_credits' }
	);
	if (!result.ok) return result;
	const person = toPerson(result.value);
	if (person.biography || language === fallbackLanguage) return { ok: true, value: person };
	const fallback = await load(
		context,
		`person:${String(id)}:${fallbackLanguage}`,
		lifetimes.film,
		personSchema,
		path,
		{ language: fallbackLanguage }
	);
	return {
		ok: true,
		value: fallback.ok ? { ...person, biography: toPerson(fallback.value).biography } : person
	};
}

/** Returns a production company or a television network. */
export async function getStudio(
	context: TmdbContext,
	kind: CompanyKind,
	id: number
): Promise<Loaded<Studio>> {
	const path = kind === 'studio' ? 'company' : 'network';
	const result = await load(
		context,
		`${path}:${String(id)}`,
		lifetimes.company,
		companySchema,
		`/${path}/${String(id)}`,
		{}
	);
	return result.ok ? { ok: true, value: toStudio(result.value) } : result;
}

/** Countries TMDB knows streaming offers for, by name. */
export async function getRegions(
	context: TmdbContext,
	language: string
): Promise<Loaded<Region[]>> {
	const result = await load(
		context,
		`regions:${language}`,
		lifetimes.company,
		regionListSchema,
		'/watch/providers/regions',
		{ language }
	);
	if (!result.ok) return result;
	return {
		ok: true,
		value: result.value.results
			.map((region) => ({ code: region.iso_3166_1, name: region.english_name }))
			.sort((a, b) => a.name.localeCompare(b.name))
	};
}

/** Streaming services offering films or series in a country, the most common first. */
export async function getServices(
	context: TmdbContext,
	region: string,
	language: string
): Promise<Loaded<Service[]>> {
	const loaded = await Promise.all(
		(['movie', 'tv'] as const).map((type) =>
			load(
				context,
				`providers:${type}:${region}:${language}`,
				lifetimes.company,
				providerListSchema,
				`/watch/providers/${type}`,
				{ language, watch_region: region }
			)
		)
	);
	const services = new Map<number, Service & { priority: number }>();
	for (const result of loaded) {
		if (!result.ok) return result;
		for (const provider of result.value.results) {
			const known = services.get(provider.provider_id);
			if (known && known.priority <= provider.display_priority) continue;
			services.set(provider.provider_id, {
				id: provider.provider_id,
				name: provider.provider_name,
				logoPath: provider.logo_path ?? null,
				priority: provider.display_priority
			});
		}
	}
	return {
		ok: true,
		value: [...services.values()]
			.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))
			.map(({ id, name, logoPath }) => ({ id, name, logoPath }))
	};
}
