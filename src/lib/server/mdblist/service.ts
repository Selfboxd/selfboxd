import * as v from 'valibot';
import type { FilmSummary } from '../../catalog/film';
import {
	publicListPageSize,
	publicListPreviewSize,
	type PublicList,
	type PublicListFilms,
	type PublicListPreview
} from '../../catalog/lists';
import type { AppDatabase } from '../db/connection';
import { readCache, writeCache } from '../tmdb/cache';
import { getFilm, type TmdbContext } from '../tmdb/service';
import { mdblistGet, type MdblistConfig, type MdblistError } from './client';
import { cachedSchema, listArraySchema, listItemsSchema, listSchema } from './schemas';

export interface MdblistContext {
	db: AppDatabase;
	config: MdblistConfig;
	/** Loads posters from TMDB; films are listed without poster when it is missing. */
	tmdb: TmdbContext | undefined;
	/** TMDB language tag of the request. */
	language: string;
}

export type MdblistFailure = MdblistError | 'invalid_response';

export type Listed<T> = { ok: true; value: T } | { ok: false; error: MdblistFailure };

const hour = 60 * 60 * 1000;

const lifetimes = { lists: 6 * hour, items: 24 * hour, search: hour };

export const listSearchMaxLength = 100;

/** Number of lists shown by the catalogue. */
export const topListCount = 9;

/** Fetches an MDBList resource through the local cache and validates its shape. */
async function load<TSchema extends v.GenericSchema>(
	context: MdblistContext,
	cacheKey: string,
	ttl: number,
	schema: TSchema,
	path: string,
	params: Record<string, string> = {}
): Promise<Listed<{ body: v.InferOutput<TSchema>; hasMore: boolean }>> {
	let cached = readCache(context.db, cacheKey);
	if (cached === undefined) {
		const response = await mdblistGet(context.config, path, params);
		if (!response.ok) return response;
		cached = { body: response.data, hasMore: response.hasMore };
		writeCache(context.db, cacheKey, cached, ttl);
	}
	const envelope = v.safeParse(cachedSchema, cached);
	const body = envelope.success ? v.safeParse(schema, envelope.output.body) : undefined;
	return envelope.success && body?.success
		? { ok: true, value: { body: body.output, hasMore: envelope.output.hasMore } }
		: { ok: false, error: 'invalid_response' };
}

/** Tells whether MDBList accepts the key of the configuration. */
export async function isMdblistKeyValid(config: MdblistConfig): Promise<boolean> {
	return (await mdblistGet(config, '/user')).ok;
}

function toPublicList(raw: v.InferOutput<typeof listSchema>): PublicList {
	return {
		id: raw.id,
		name: raw.name,
		owner: raw.user_name ?? null,
		itemCount: raw.items ?? null,
		likes: raw.likes ?? null
	};
}

/** Returns one page of the films of a public list, each with its TMDB poster when available. */
export async function getListFilms(
	context: MdblistContext,
	listId: number,
	page = 1,
	pageSize = publicListPageSize
): Promise<Listed<PublicListFilms>> {
	const result = await load(
		context,
		`mdblist:items:${String(listId)}:${String(pageSize)}:${String(page)}`,
		lifetimes.items,
		listItemsSchema,
		`/lists/${String(listId)}/items`,
		{ mediatype: 'movie', limit: String(pageSize), offset: String((page - 1) * pageSize) }
	);
	if (!result.ok) return result;

	const { tmdb } = context;
	const films = await Promise.all(
		result.value.body.movies.map(async (movie): Promise<FilmSummary> => {
			const id = movie.ids?.tmdb ?? movie.id;
			const fallback = {
				id,
				title: movie.title,
				year: movie.release_year ?? null,
				posterPath: null
			};
			if (!tmdb) return fallback;
			const details = await getFilm(tmdb, id, context.language, '');
			if (!details.ok) return fallback;
			const { title, year, posterPath } = details.value;
			return { id, title, year, posterPath };
		})
	);
	return {
		ok: true,
		value: {
			films,
			page,
			hasMore: result.value.hasMore || result.value.body.movies.length === pageSize
		}
	};
}

async function withPreview(
	context: MdblistContext,
	lists: PublicList[]
): Promise<PublicListPreview[]> {
	return Promise.all(
		lists.map(async (list) => {
			const films = await getListFilms(context, list.id, 1, publicListPreviewSize);
			return { ...list, preview: films.ok ? films.value.films : [] };
		})
	);
}

/** Returns the most popular public lists, each with its first films. */
export async function getTopLists(context: MdblistContext): Promise<Listed<PublicListPreview[]>> {
	const result = await load(
		context,
		'mdblist:top',
		lifetimes.lists,
		listArraySchema,
		'/lists/top',
		{
			limit: String(topListCount)
		}
	);
	if (!result.ok) return result;
	return { ok: true, value: await withPreview(context, result.value.body.map(toPublicList)) };
}

/** Returns the public lists whose name matches the query, each with its first films. */
export async function searchLists(
	context: MdblistContext,
	rawQuery: string
): Promise<Listed<PublicListPreview[]>> {
	const query = rawQuery.trim().slice(0, listSearchMaxLength);
	if (!query) return { ok: true, value: [] };
	const result = await load(
		context,
		`mdblist:search:${query.toLowerCase()}`,
		lifetimes.search,
		listArraySchema,
		'/lists/search',
		{ query, limit: String(topListCount) }
	);
	if (!result.ok) return result;
	const lists = result.value.body.slice(0, topListCount).map(toPublicList);
	return { ok: true, value: await withPreview(context, lists) };
}

export async function getListInfo(
	context: MdblistContext,
	listId: number
): Promise<Listed<PublicList>> {
	const result = await load(
		context,
		`mdblist:list:${String(listId)}`,
		lifetimes.lists,
		v.union([listSchema, v.pipe(listArraySchema, v.minLength(1))]),
		`/lists/${String(listId)}`
	);
	if (!result.ok) return result;
	const { body } = result.value;
	const raw = Array.isArray(body) ? body[0] : body;
	return raw ? { ok: true, value: toPublicList(raw) } : { ok: false, error: 'not_found' };
}
