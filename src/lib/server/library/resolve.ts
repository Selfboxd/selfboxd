import { error } from '@sveltejs/kit';
import type { Film } from '../../catalog/film';
import type { Work } from '../../catalog/library';
import { getDatabase } from '../db/index';
import { getTmdbContext } from '../tmdb/index';
import { requestLanguage, requestRegion } from '../tmdb/page';
import { getFilm } from '../tmdb/service';
import { saveWork } from './works';

export const filmIdPattern = /^\d{1,9}$/;

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
	const work = saveWork(getDatabase(), {
		kind: 'film',
		externalId: id,
		title: film.value.title,
		year: film.value.year,
		posterPath: film.value.posterPath
	});
	return { work, film: film.value };
}
