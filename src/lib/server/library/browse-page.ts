import type { WorkKind } from '../../catalog/library';
import { listVisibilities } from '../../catalog/list-view';
import { getDatabase } from '../db/index';
import { parseBrowseFilter } from '../tmdb/browse';
import { getTmdbContext } from '../tmdb/index';
import { requestLanguage } from '../tmdb/page';
import {
	browseFilms,
	browseSeries,
	getGenres,
	getSeriesGenres,
	type BrowseScope
} from '../tmdb/service';
import { listMarks, markKey } from './marks';

/** Loads one page of the films or series matching the query string of the browse page. */
export async function loadBrowse(
	kind: WorkKind,
	userId: number,
	params: URLSearchParams,
	scope: BrowseScope = {}
) {
	const context = getTmdbContext();
	if (!context) return { state: 'not_configured' as const };

	const language = requestLanguage();
	const genres = await (kind === 'series' ? getSeriesGenres : getGenres)(context, language);
	const known = genres.ok ? genres.value : [];
	const parsed = parseBrowseFilter(params);
	const filter = {
		...parsed,
		genre: known.some((genre) => genre.id === parsed.genre) ? parsed.genre : null
	};
	const visibility = listVisibilities.find((name) => name === params.get('show')) ?? 'all';
	const result = await (kind === 'series' ? browseSeries : browseFilms)(
		context,
		filter,
		language,
		scope
	);
	if (!result.ok) return { state: 'error' as const, error: result.error };

	const marks = listMarks(getDatabase(), userId);
	const works = result.value.films
		.map((film) => ({ ...film, watched: marks.get(markKey(kind, film.id))?.watched ?? false }))
		.filter((film) => visibility === 'all' || film.watched === (visibility === 'watched'));
	return {
		state: 'ready' as const,
		genres: known,
		filter,
		visibility,
		works,
		page: result.value.page,
		totalPages: result.value.totalPages,
		total: result.value.total
	};
}
