import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { parseId } from '#lib/server/library/forms.js';
import { getList } from '#lib/server/library/lists.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params }) => {
	const { user } = requireUser(locals);
	const id = parseId(params.id);
	const list = id === undefined ? undefined : getList(getDatabase(), user.id, id);
	if (!list) error(404);
	return { list };
};
