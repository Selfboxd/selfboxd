import { apiError, apiJson } from '#lib/server/api/responses.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage, requestRegion } from '#lib/server/tmdb/page.js';
import { getFilm } from '#lib/server/tmdb/service.js';
import { tmdbErrorStatus } from '#lib/server/tmdb/status.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	if (!/^\d{1,9}$/.test(params.id)) return apiError(404, 'not_found');
	const context = getTmdbContext();
	if (!context) return apiError(503, 'tmdb_not_configured');

	const film = await getFilm(context, Number(params.id), requestLanguage(), requestRegion());
	if (!film.ok) return apiError(tmdbErrorStatus(film.error), film.error);
	return apiJson({ film: film.value });
};
