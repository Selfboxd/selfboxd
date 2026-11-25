import { error, redirect } from '@sveltejs/kit';
import { chartPageMax, chartPageSize, isChart, type Chart } from '#lib/catalog/charts.js';
import type { FilmSummary } from '#lib/catalog/film.js';
import {
	applyListOptions,
	isRefined,
	listActionMax,
	listDecades,
	parseListOptions
} from '#lib/catalog/list-view.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { parseId } from '#lib/server/library/forms.js';
import {
	cloneWorks,
	genreChoices,
	toEntries,
	watchlistWorks,
	withGenres,
	workInput
} from '#lib/server/library/list-page.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage } from '#lib/server/tmdb/page.js';
import { getChart, type TmdbContext } from '#lib/server/tmdb/service.js';
import { chartName } from '#lib/i18n/charts.js';
import type { Actions, PageServerLoad } from './$types';

function chartContext(chart: string): { chart: Chart; context: TmdbContext } {
	if (!isChart(chart)) error(404);
	const context = getTmdbContext();
	if (!context) error(503);
	return { chart, context };
}

/** The first films of a chart, as many as one action applies to. */
async function leadingFilms(context: TmdbContext, chart: Chart): Promise<FilmSummary[]> {
	const pages = Math.min(Math.ceil(listActionMax / chartPageSize), chartPageMax);
	const language = requestLanguage();
	const loaded = await Promise.all(
		Array.from({ length: pages }, (_, index) => getChart(context, chart, language, index + 1))
	);
	if (!loaded[0]?.ok) error(502);
	const films = loaded.flatMap((result) => (result.ok ? result.value.films : []));
	const unique = films.filter(
		(film, index) => films.findIndex((other) => other.id === film.id) === index
	);
	return unique.slice(0, listActionMax);
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { user } = requireUser(locals);
	const { chart, context } = chartContext(params.chart);
	const options = parseListOptions(url.searchParams);
	const refined = isRefined(options);

	const requested = parseId(url.searchParams.get('page') ?? '1');
	const page = !refined && requested !== undefined && requested <= chartPageMax ? requested : 1;
	const language = requestLanguage();
	const [current, opening, genres] = await Promise.all([
		getChart(context, chart, language, page),
		page === 1 ? undefined : getChart(context, chart, language),
		genreChoices()
	]);
	if (!current.ok) error(502);
	const films = refined ? await leadingFilms(context, chart) : current.value.films;
	const all = toEntries(
		user.id,
		films.map((film) => ({ film })),
		(page - 1) * chartPageSize + 1
	);
	const backdropPath = opening?.ok ? opening.value.backdropPath : current.value.backdropPath;
	return {
		chart,
		entries: applyListOptions(await withGenres(all, options), options),
		page,
		totalPages: refined ? 1 : current.value.totalPages,
		options,
		decades: listDecades(all),
		genres,
		backdropPath
	};
};

export const actions: Actions = {
	clone: async ({ locals, params }) => {
		const { user } = requireUser(locals);
		const { chart, context } = chartContext(params.chart);
		const films = await leadingFilms(context, chart);
		const cloned = cloneWorks(
			user.id,
			chartName(chart),
			'',
			films.map((film) => workInput(film))
		);
		redirect(303, `/profile/lists/${String(cloned)}`);
	},

	watchlist: async ({ locals, params }) => {
		const { user } = requireUser(locals);
		const { chart, context } = chartContext(params.chart);
		const films = await leadingFilms(context, chart);
		watchlistWorks(
			user.id,
			films.map((film) => workInput(film))
		);
		return { action: 'watchlist' as const, success: true };
	}
};
