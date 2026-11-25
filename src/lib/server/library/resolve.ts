import { error } from '@sveltejs/kit';
import type { Film } from '../../catalog/film';
import type { Work, WorkKind } from '../../catalog/library';
import type { Series } from '../../catalog/series';
import { getDatabase } from '../db/index';
import { getTmdbContext } from '../tmdb/index';
import { requestLanguage, requestRegion } from '../tmdb/page';
import { getFilm, getSeries, type Loaded, type TmdbContext } from '../tmdb/service';
import { saveWork } from './works';

/** Shape of a TMDB identifier, the same for films and series. */
export const filmIdPattern = /^\d{1,9}$/;

type Details = Film | Series;

/** Loads a film or a series from TMDB. */
export function loadWorkDetails(
	context: TmdbContext,
	kind: WorkKind,
	id: string
): Promise<Loaded<Details>> {
	const load = kind === 'series' ? getSeries : getFilm;
	return load(context, Number(id), requestLanguage(), requestRegion());
}

/** Stores a film or a series loaded from TMDB as a work. */
export function saveDetails(kind: WorkKind, details: Details): Work {
	return saveWork(getDatabase(), {
		kind,
		externalId: String(details.id),
		title: details.title,
		year: details.year,
		posterPath: details.posterPath
	});
}

/**
 * Loads a film or a series from TMDB and stores it as a work, so that an account can act on it.
 * Ends the request with an error when it cannot be loaded.
 */
export async function resolveWork(kind: WorkKind, id: string): Promise<Work> {
	if (!filmIdPattern.test(id)) error(404);
	const context = getTmdbContext();
	if (!context) error(503);
	const details = await loadWorkDetails(context, kind, id);
	if (!details.ok) error(details.error === 'not_found' ? 404 : 502);
	return saveDetails(kind, details.value);
}

/**
 * Loads a film from TMDB and stores it as a work, so that an account can act on it.
 * Ends the request with an error when the film cannot be loaded.
 */
export async function resolveFilm(id: string): Promise<{ work: Work; film: Film }> {
	if (!filmIdPattern.test(id)) error(404);
	const context = getTmdbContext();
	if (!context) error(503);
	const film = await getFilm(context, Number(id), requestLanguage(), requestRegion());
	if (!film.ok) error(film.error === 'not_found' ? 404 : 502);
	return { work: saveDetails('film', film.value), film: film.value };
}
