import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listTagCounts } from '#lib/server/library/profile.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const { user } = requireUser(locals);
	return { tags: listTagCounts(getDatabase(), user.id) };
};
