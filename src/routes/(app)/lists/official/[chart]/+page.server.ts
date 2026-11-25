import { error } from '@sveltejs/kit';
import { chartPageMax, isChart } from '#lib/catalog/charts.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { parseId } from '#lib/server/library/forms.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage } from '#lib/server/tmdb/page.js';
import { getChart } from '#lib/server/tmdb/service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	requireUser(locals);
	const { chart } = params;
	if (!isChart(chart)) error(404);
	const context = getTmdbContext();
	if (!context) error(503);

	const requested = parseId(url.searchParams.get('page') ?? '1');
	const page = requested !== undefined && requested <= chartPageMax ? requested : 1;
	const language = requestLanguage();
	const [films, opening] = await Promise.all([
		getChart(context, chart, language, page),
		page === 1 ? undefined : getChart(context, chart, language)
	]);
	if (!films.ok) error(502);
	const backdropPath = opening?.ok ? opening.value.backdropPath : films.value.backdropPath;
	return { chart, ...films.value, backdropPath };
};
