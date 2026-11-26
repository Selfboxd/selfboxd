import { error, fail, redirect } from '@sveltejs/kit';
import { listNameMaxLength } from '#lib/catalog/library.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { parseId } from '#lib/server/library/forms.js';
import { addWorksToList, cloneWorks, watchlistWorks } from '#lib/server/library/list-page.js';
import { loadPerson, personWorks } from '#lib/server/library/person-page.js';
import { filmIdPattern } from '#lib/server/library/resolve.js';
import type { Actions, PageServerLoad } from './$types';

function personId(raw: string): number {
	if (!filmIdPattern.test(raw)) error(404);
	return Number(raw);
}

export const load: PageServerLoad = ({ params, locals, url }) => {
	const { user } = requireUser(locals);
	return loadPerson(user.id, personId(params.id), url.searchParams);
};

export const actions: Actions = {
	watchlist: async ({ locals, params, url }) => {
		const { user } = requireUser(locals);
		const { works } = await personWorks(user.id, personId(params.id), url.searchParams);
		watchlistWorks(user.id, works);
		return { action: 'watchlist' as const, success: true };
	},

	list: async ({ locals, params, url, request }) => {
		const { user } = requireUser(locals);
		const { name, works } = await personWorks(user.id, personId(params.id), url.searchParams);
		const form = await request.formData();
		const target = form.get('list');
		if (target === 'new') {
			const entered = form.get('name');
			const typed = typeof entered === 'string' ? entered.trim() : '';
			const listId = cloneWorks(user.id, (typed || name).slice(0, listNameMaxLength), '', works);
			redirect(303, `/profile/lists/${String(listId)}`);
		}
		const listId = parseId(typeof target === 'string' ? target : '');
		if (listId === undefined || !addWorksToList(user.id, listId, works)) {
			return fail(400, { action: 'list' as const, error: 'list_invalid' as const });
		}
		redirect(303, `/profile/lists/${String(listId)}`);
	}
};
