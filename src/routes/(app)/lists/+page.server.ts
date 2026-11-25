import { requireUser } from '#lib/server/auth/guards.js';
import { getMdblistContext } from '#lib/server/mdblist/index.js';
import { getTopLists, listSearchMaxLength, searchLists } from '#lib/server/mdblist/service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireUser(locals);
	const query = (url.searchParams.get('q') ?? '').trim().slice(0, listSearchMaxLength);
	const context = getMdblistContext();
	if (!context) return { state: 'not_configured' as const, query };

	const lists = query ? await searchLists(context, query) : await getTopLists(context);
	if (!lists.ok) return { state: 'error' as const, error: lists.error, query };
	return { state: 'ready' as const, lists: lists.value, query };
};
