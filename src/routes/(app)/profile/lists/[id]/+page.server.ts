import { error } from '@sveltejs/kit';
import type { ListProgress } from '#lib/catalog/lists.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { parseId } from '#lib/server/library/forms.js';
import { getList } from '#lib/server/library/lists.js';
import { listWatchedFilmIds } from '#lib/server/library/watched.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage } from '#lib/server/tmdb/page.js';
import { getFilm } from '#lib/server/tmdb/service.js';
import type { PageServerLoad } from './$types';

/** Loads the TMDB backdrop of a film, or `null` when it cannot be loaded. */
async function loadBackdrop(externalId: string | undefined): Promise<string | null> {
	const context = getTmdbContext();
	if (!context || externalId === undefined) return null;
	const film = await getFilm(context, Number(externalId), requestLanguage(), '');
	return film.ok ? film.value.backdropPath : null;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user } = requireUser(locals);
	const id = parseId(params.id);
	const db = getDatabase();
	const list = id === undefined ? undefined : getList(db, user.id, id);
	if (!list) error(404);

	let progress: ListProgress | null = null;
	if (list.items.length > 0) {
		const watched = listWatchedFilmIds(db, user.id);
		progress = {
			watched: list.items.filter((item) => watched.has(item.work.externalId)).length,
			total: list.items.length
		};
	}
	return { list, progress, backdropPath: await loadBackdrop(list.items[0]?.work.externalId) };
};
