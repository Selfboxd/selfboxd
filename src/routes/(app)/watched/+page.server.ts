import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listWatched } from '#lib/server/library/watched.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const { user } = requireUser(locals);
	return {
		films: listWatched(getDatabase(), user.id).filter((entry) => entry.work.kind === 'film')
	};
};
