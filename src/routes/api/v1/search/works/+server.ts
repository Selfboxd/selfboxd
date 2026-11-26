import type { WorkSearchResult } from '#lib/catalog/search.js';
import { apiError, apiJson } from '#lib/server/api/responses.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage } from '#lib/server/tmdb/page.js';
import { searchPageMax, searchWorks } from '#lib/server/tmdb/service.js';
import { tmdbErrorStatus } from '#lib/server/tmdb/status.js';
import type { RequestHandler } from './$types';

const kinds = ['all', 'film', 'series'] as const;

export const GET: RequestHandler = async ({ url }) => {
	const context = getTmdbContext();
	if (!context) return apiError(503, 'tmdb_not_configured');

	const page = Number(url.searchParams.get('page') ?? '1');
	const kind = kinds.find((entry) => entry === (url.searchParams.get('kind') ?? 'all'));
	if (!kind || !Number.isInteger(page) || page < 1 || page > searchPageMax) {
		return apiError(400, 'invalid_request');
	}

	const query = url.searchParams.get('q') ?? '';
	const result = await searchWorks(context, query, requestLanguage(), page, kind);
	if (!result.ok) return apiError(tmdbErrorStatus(result.error), result.error);
	const { results, ...pages } = result.value;
	const works = results.filter((entry): entry is WorkSearchResult => entry.kind !== 'person');
	return apiJson({ ...pages, works });
};
