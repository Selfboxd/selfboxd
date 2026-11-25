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
	const marks = listMarks(getDatabase(), userId);
	return {
		state: 'ready' as const,
		person: details,
		roles: roleCounts(credits),
		fallback,
		options,
		decades: creditDecades(credits, options.role),
		genres: genres.filter((genre) => used.has(genre.id)),
		works: applyPersonOptions(
			credits,
			options,
			(credit) => marks.get(markKey(credit.kind, credit.id))?.watched ?? false
		)
	};
}
