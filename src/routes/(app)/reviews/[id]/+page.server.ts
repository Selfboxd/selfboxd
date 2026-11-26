import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { getDiaryEntry } from '#lib/server/library/diary.js';
import { parseId } from '#lib/server/library/forms.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage, requestRegion } from '#lib/server/tmdb/page.js';
import { getFilm, getSeries } from '#lib/server/tmdb/service.js';
import type { PageServerLoad } from './$types';

/** Backdrop and seasons of the work from TMDB, left out when TMDB cannot answer. */
async function loadDetails(kind: 'film' | 'series', id: number) {
	const context = getTmdbContext();
	if (!context) return { backdropPath: null, seasons: [] };
	if (kind === 'film') {
		const film = await getFilm(context, id, requestLanguage(), requestRegion());
		return { backdropPath: film.ok ? film.value.backdropPath : null, seasons: [] };
	}
	const series = await getSeries(context, id, requestLanguage(), requestRegion());
	return series.ok
		? {
				backdropPath: series.value.backdropPath,
				seasons: series.value.seasons.map((season) => season.number)
			}
		: { backdropPath: null, seasons: [] };
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = requireUser(locals);
	const entryId = parseId(params.id);
	const entry = entryId === undefined ? undefined : getDiaryEntry(getDatabase(), user.id, entryId);
	if (!entry) error(404);
	return { entry, ...(await loadDetails(entry.work.kind, Number(entry.work.externalId))) };
};
