import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listDiaryEntries } from '#lib/server/library/diary.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const { user } = requireUser(locals);
	const entries = listDiaryEntries(getDatabase(), user.id);
	const requested = url.searchParams.get('tag');
	const tag = entries.some((entry) => requested !== null && entry.tags.includes(requested))
		? requested
		: null;
	return {
		tag,
		entries: tag === null ? entries : entries.filter((entry) => entry.tags.includes(tag))
	};
};
