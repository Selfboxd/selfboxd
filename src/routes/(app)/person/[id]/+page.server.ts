import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.js';
import { loadPerson } from '#lib/server/library/person-page.js';
import { filmIdPattern } from '#lib/server/library/resolve.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals, url }) => {
	if (!filmIdPattern.test(params.id)) error(404);
	const { user } = requireUser(locals);
	return loadPerson(user.id, Number(params.id), url.searchParams);
};
