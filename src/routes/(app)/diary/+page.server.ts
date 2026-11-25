import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listDiaryEntries } from '#lib/server/library/diary.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const { user } = requireUser(locals);
	return { entries: listDiaryEntries(getDatabase(), user.id) };
};
