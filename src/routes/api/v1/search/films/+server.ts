import { apiError, apiJson } from '#lib/server/api/responses.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage } from '#lib/server/tmdb/page.js';
import { searchFilms, searchPageMax } from '#lib/server/tmdb/service.js';
import { tmdbErrorStatus } from '#lib/server/tmdb/status.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const context = getTmdbContext();
	if (!context) return apiError(503, 'tmdb_not_configured');

	const page = Number(url.searchParams.get('page') ?? '1');
	if (!Number.isInteger(page) || page < 1 || page > searchPageMax) {
		return apiError(400, 'invalid_request');
	}

	const query = url.searchParams.get('q') ?? '';
	const result = await searchFilms(context, query, requestLanguage(), page);
	if (!result.ok) return apiError(tmdbErrorStatus(result.error), result.error);
	return apiJson(result.value);
};
