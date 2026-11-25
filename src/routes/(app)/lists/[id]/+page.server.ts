import { error } from '@sveltejs/kit';
import { publicListPageMax, type ListProgress } from '#lib/catalog/lists.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { parseId } from '#lib/server/library/forms.js';
import { listWatchedFilmIds } from '#lib/server/library/watched.js';
import { getMdblistContext } from '#lib/server/mdblist/index.js';
import { getListFilmIds, getListFilms, getListInfo } from '#lib/server/mdblist/service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { user } = requireUser(locals);
	const id = parseId(params.id);
	const context = getMdblistContext();
	if (id === undefined || !context) error(404);

	const requested = parseId(url.searchParams.get('page') ?? '1');
	const page = requested !== undefined && requested <= publicListPageMax ? requested : 1;
	const [list, films, opening, ids] = await Promise.all([
		getListInfo(context, id),
		getListFilms(context, id, page),
		page === 1 ? undefined : getListFilms(context, id, 1),
		getListFilmIds(context, id)
	]);
	if (!list.ok) error(list.error === 'not_found' ? 404 : 502);
	if (!films.ok) error(films.error === 'not_found' ? 404 : 502);

	let progress: ListProgress | null = null;
	if (ids.ok && ids.value && ids.value.length > 0) {
		const watched = listWatchedFilmIds(context.db, user.id);
		progress = {
			watched: ids.value.filter((film) => watched.has(String(film))).length,
			total: ids.value.length
		};
	}
	const backdropPath = opening?.ok ? opening.value.backdropPath : films.value.backdropPath;
	return { list: list.value, ...films.value, backdropPath, progress };
};
