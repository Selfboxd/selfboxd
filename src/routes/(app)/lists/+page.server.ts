import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listLists } from '#lib/server/library/lists.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const { user } = requireUser(locals);
	return { lists: listLists(getDatabase(), user.id) };
};
