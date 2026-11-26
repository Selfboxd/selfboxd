import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { loadStats } from '#lib/server/library/stats.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = requireUser(locals);
	const yearValue = url.searchParams.get('year');
	const kindValue = url.searchParams.get('kind');
	const kind = kindValue === 'film' || kindValue === 'series' ? kindValue : null;
	const year = yearValue !== null && /^\d{4}$/.test(yearValue) ? Number(yearValue) : null;
	return { ...(await loadStats(getDatabase(), getTmdbContext(), user.id, { year, kind })), kind };
};
