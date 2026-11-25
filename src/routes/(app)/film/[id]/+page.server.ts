import { error } from '@sveltejs/kit';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage, requestRegion } from '#lib/server/tmdb/page.js';
import { getCollection, getFilm } from '#lib/server/tmdb/service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	if (!/^\d{1,9}$/.test(params.id)) error(404);
	const context = getTmdbContext();
	if (!context) return { state: 'not_configured' as const };

	const language = requestLanguage();
	const film = await getFilm(context, Number(params.id), language, requestRegion());
	if (!film.ok) {
		if (film.error === 'not_found') error(404);
		return { state: 'error' as const, error: film.error };
	}

	const collection = film.value.collection
		? await getCollection(context, film.value.collection.id, language)
		: undefined;
	const related = collection?.ok
		? {
				name: collection.value.name,
				films: collection.value.films.filter((other) => other.id !== film.value.id)
			}
		: null;

	return { state: 'ready' as const, film: film.value, related };
};
