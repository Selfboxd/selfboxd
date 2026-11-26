import { requireUser } from '#lib/server/auth/guards.js';
import { loadWatchedPage } from '#lib/server/library/watched-page.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const { user } = requireUser(locals);
	return loadWatchedPage(user.id, 'series', url.searchParams);
};
