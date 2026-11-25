import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { loadLibrary } from '#lib/server/library/page-library.js';
import { filmIdPattern } from '#lib/server/library/resolve.js';
import { workActions } from '#lib/server/library/work-actions.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage, requestRegion } from '#lib/server/tmdb/page.js';
import { getCollection, getFilm } from '#lib/server/tmdb/service.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!filmIdPattern.test(params.id)) error(404);
	const { user } = requireUser(locals);
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

	return {
		state: 'ready' as const,
		film: film.value,
		related,
		library: loadLibrary(user.id, 'film', params.id)
	};
};

export const actions: Actions = workActions('film');
