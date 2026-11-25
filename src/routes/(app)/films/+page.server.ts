import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage } from '#lib/server/tmdb/page.js';
import { getPopularFilms } from '#lib/server/tmdb/service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const context = getTmdbContext();
	if (!context) return { state: 'not_configured' as const };
	const films = await getPopularFilms(context, requestLanguage());
	if (!films.ok) return { state: 'error' as const, error: films.error };
	return { state: 'ready' as const, films: films.value };
};
