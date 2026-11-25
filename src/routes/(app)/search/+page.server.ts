import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage } from '#lib/server/tmdb/page.js';
import { searchFilms, searchQueryMaxLength } from '#lib/server/tmdb/service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const query = (url.searchParams.get('q') ?? '').trim().slice(0, searchQueryMaxLength);
	const context = getTmdbContext();
	if (!context) return { query, state: 'not_configured' as const };

	const result = await searchFilms(context, query, requestLanguage());
	if (!result.ok) return { query, state: 'error' as const, error: result.error };
	return { query, state: 'ready' as const, films: result.value.films };
};
