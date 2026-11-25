import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { loadLibrary } from '#lib/server/library/page-library.js';
import { filmIdPattern } from '#lib/server/library/resolve.js';
import { workActions } from '#lib/server/library/work-actions.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage, requestRegion } from '#lib/server/tmdb/page.js';
import { getSeries } from '#lib/server/tmdb/service.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!filmIdPattern.test(params.id)) error(404);
	const { user } = requireUser(locals);
	const context = getTmdbContext();
	if (!context) return { state: 'not_configured' as const };

	const series = await getSeries(context, Number(params.id), requestLanguage(), requestRegion());
	if (!series.ok) {
		if (series.error === 'not_found') error(404);
		return { state: 'error' as const, error: series.error };
	}
	return {
		state: 'ready' as const,
		series: series.value,
		library: loadLibrary(user.id, 'series', params.id)
	};
};

export const actions: Actions = workActions('series');
