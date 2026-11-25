import { parseBrowseFilter } from '#lib/server/tmdb/browse.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage } from '#lib/server/tmdb/page.js';
import { browseSeries, getSeriesGenres } from '#lib/server/tmdb/service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const context = getTmdbContext();
	if (!context) return { state: 'not_configured' as const };

	const language = requestLanguage();
	const genres = await getSeriesGenres(context, language);
	const known = genres.ok ? genres.value : [];
	const parsed = parseBrowseFilter(url.searchParams);
	const filter = {
		...parsed,
		genre: known.some((genre) => genre.id === parsed.genre) ? parsed.genre : null
	};
	const result = await browseSeries(context, filter, language);
	if (!result.ok) return { state: 'error' as const, error: result.error };
	return { state: 'ready' as const, genres: known, filter, ...result.value };
};
