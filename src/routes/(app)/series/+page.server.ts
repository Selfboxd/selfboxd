import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage } from '#lib/server/tmdb/page.js';
import { browseSeries, getPopularSeries, getSeriesGenres } from '#lib/server/tmdb/service.js';
import type { PageServerLoad } from './$types';

/** Number of series shown in each row of the page. */
const popularCount = 4;
const rowCount = 12;

export const load: PageServerLoad = async () => {
	const context = getTmdbContext();
	if (!context) return { state: 'not_configured' as const };

	const language = requestLanguage();
	const filter = { decade: null, year: null, genre: null, service: null, page: 1 };
	const [popular, genres, rated, upcoming] = await Promise.all([
		getPopularSeries(context, language),
		getSeriesGenres(context, language),
		browseSeries(context, { ...filter, sort: 'rating' }, language),
		browseSeries(context, { ...filter, sort: 'upcoming' }, language)
	]);
	if (!popular.ok) return { state: 'error' as const, error: popular.error };
	return {
		state: 'ready' as const,
		genres: genres.ok ? genres.value : [],
		popular: popular.value.slice(0, popularCount),
		rated: rated.ok ? rated.value.films.slice(0, rowCount) : [],
		upcoming: upcoming.ok ? upcoming.value.films.slice(0, rowCount) : []
	};
};
