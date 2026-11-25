import { formText } from '#lib/server/auth/forms.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listTagNames } from '#lib/server/library/tags.js';
import { deleteFromWatchlist, listWatchlist } from '#lib/server/library/watchlist.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const { user } = requireUser(locals);
	const db = getDatabase();
	const tags = listTagNames(db, user.id, 'watchlist');
	const requested = url.searchParams.get('tag');
	const tag = tags.find((name) => name === requested) ?? null;
	return { tags, tag, items: listWatchlist(db, user.id, tag ?? undefined) };
};

export const actions: Actions = {
	remove: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const workId = Number(formText(await request.formData(), 'workId'));
		if (Number.isInteger(workId)) deleteFromWatchlist(getDatabase(), user.id, workId);
		return { success: true };
	}
};
