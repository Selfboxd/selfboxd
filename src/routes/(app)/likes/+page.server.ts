import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listLikedLists } from '#lib/server/library/list-likes.js';
import { listLiked } from '#lib/server/library/profile.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const { user } = requireUser(locals);
	const db = getDatabase();
	return { films: listLiked(db, user.id), lists: listLikedLists(db, user.id) };
};
