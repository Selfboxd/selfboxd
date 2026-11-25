import { error } from '@sveltejs/kit';
import { publicListPageMax } from '#lib/catalog/lists.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { parseId } from '#lib/server/library/forms.js';
import { getMdblistContext } from '#lib/server/mdblist/index.js';
import { getListFilms, getListInfo } from '#lib/server/mdblist/service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	requireUser(locals);
	const id = parseId(params.id);
	const context = getMdblistContext();
	if (id === undefined || !context) error(404);

	const requested = parseId(url.searchParams.get('page') ?? '1');
	const page = requested !== undefined && requested <= publicListPageMax ? requested : 1;
	const [list, films] = await Promise.all([
		getListInfo(context, id),
		getListFilms(context, id, page)
	]);
	if (!list.ok) error(list.error === 'not_found' ? 404 : 502);
	if (!films.ok) error(films.error === 'not_found' ? 404 : 502);
	return { list: list.value, ...films.value };
};
