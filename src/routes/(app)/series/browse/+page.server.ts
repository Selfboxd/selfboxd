import { requireUser } from '#lib/server/auth/guards.js';
import { loadBrowse } from '#lib/server/library/browse-page.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const { user } = requireUser(locals);
	return loadBrowse('series', user.id, url.searchParams);
};
