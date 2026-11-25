import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage } from '#lib/server/tmdb/page.js';
import { searchFilms, searchPageMax, searchQueryMaxLength } from '#lib/server/tmdb/service.js';
import type { PageServerLoad } from './$types';

function parsePage(value: string | null): number {
	const page = Number(value);
	return Number.isInteger(page) && page >= 1 && page <= searchPageMax ? page : 1;
}

export const load: PageServerLoad = async ({ url }) => {
	const query = (url.searchParams.get('q') ?? '').trim().slice(0, searchQueryMaxLength);
	const context = getTmdbContext();
	if (!context) return { query, state: 'not_configured' as const };

	const page = parsePage(url.searchParams.get('page'));
	const result = await searchFilms(context, query, requestLanguage(), page);
	if (!result.ok) return { query, state: 'error' as const, error: result.error };
	return { query, state: 'ready' as const, ...result.value };
};
