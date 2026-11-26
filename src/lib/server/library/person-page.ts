import { error } from '@sveltejs/kit';
import type { Genre } from '../../catalog/browse';
import {
	applyPersonOptions,
	creditDecades,
	defaultRole,
	parsePersonOptions,
	roleCounts
} from '../../catalog/person';
import { getDatabase } from '../db/index';
import { getTmdbContext } from '../tmdb/index';
import { requestLanguage } from '../tmdb/page';
import { getGenres, getPerson, getSeriesGenres } from '../tmdb/service';
import { listMarks, markKey } from './marks';
import { listActionMax } from '../../catalog/list-view';
import type { PersonCredit } from '../../catalog/person';
import { roleName } from '../../i18n/person';
import { listLists } from './lists';
import { progressOf, workInput } from './list-page';
import type { WorkInput } from './works';

/** Genres of films and of series, each once. */
async function allGenres(
	context: NonNullable<ReturnType<typeof getTmdbContext>>,
	language: string
): Promise<Genre[]> {
	const [films, series] = await Promise.all([
		getGenres(context, language),
		getSeriesGenres(context, language)
	]);
	const genres = new Map<number, Genre>();
	for (const genre of [...(films.ok ? films.value : []), ...(series.ok ? series.value : [])]) {
		if (!genres.has(genre.id)) genres.set(genre.id, genre);
	}
	return [...genres.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Loads a person page: the person, the tabs of their roles and the works of the current one. */
export async function loadPerson(userId: number, id: number, params: URLSearchParams) {
	const context = getTmdbContext();
	if (!context) return { state: 'not_configured' as const };

	const language = requestLanguage();
	const [person, genres] = await Promise.all([
		getPerson(context, id, language),
		allGenres(context, language)
	]);
	if (!person.ok) {
		if (person.error === 'not_found') error(404);
		return { state: 'error' as const, error: person.error };
	}

	const { credits, ...details } = person.value;
	const fallback = defaultRole(person.value);
	const options = parsePersonOptions(params, fallback);
	const inRole = credits.filter((credit) => credit.role === options.role);
	const used = new Set(inRole.flatMap((credit) => credit.genres));
	const db = getDatabase();
	const marks = listMarks(db, userId);
	const watched = (credit: PersonCredit) =>
		marks.get(markKey(credit.kind, credit.id))?.watched ?? false;
	const shown = applyPersonOptions(credits, { ...options, show: 'all' }, watched);
	return {
		state: 'ready' as const,
		person: details,
		roles: roleCounts(credits),
		fallback,
		options,
		decades: creditDecades(credits, options.role),
		genres: genres.filter((genre) => used.has(genre.id)),
		works: applyPersonOptions(credits, options, watched),
		progress: progressOf(shown.map((credit) => ({ watched: credit.watched }))),
		lists: listLists(db, userId).map(({ id: listId, name }) => ({ id: listId, name }))
	};
}

/** Works of a person page as its options show them, as many as one action applies to. */
export async function personWorks(
	userId: number,
	id: number,
	params: URLSearchParams
): Promise<{ name: string; works: WorkInput[] }> {
	const loaded = await loadPerson(userId, id, params);
	if (loaded.state !== 'ready') error(502);
	return {
		name: `${loaded.person.name} - ${roleName(loaded.options.role)}`,
		works: loaded.works.slice(0, listActionMax).map((work) => workInput(work))
	};
}
