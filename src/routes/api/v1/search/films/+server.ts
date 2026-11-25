import { apiError, apiJson } from '#lib/server/api/responses.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage } from '#lib/server/tmdb/page.js';
import { searchFilms } from '#lib/server/tmdb/service.js';
import { tmdbErrorStatus } from '#lib/server/tmdb/status.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const context = getTmdbContext();
	if (!context) return apiError(503, 'tmdb_not_configured');

	const result = await searchFilms(context, url.searchParams.get('q') ?? '', requestLanguage());
	if (!result.ok) return apiError(tmdbErrorStatus(result.error), result.error);
	return apiJson(result.value);
};
