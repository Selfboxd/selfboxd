import { error, redirect } from '@sveltejs/kit';
import {
	applyListOptions,
	isRefined,
	likedListPreviewSize,
	listActionMax,
	listDecades
} from '#lib/catalog/list-view.js';
import { publicListPageMax, publicListPageSize, type ListProgress } from '#lib/catalog/lists.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { parseId } from '#lib/server/library/forms.js';
import {
	cloneWorks,
	genreChoices,
	likeList,
	likesList,
	toEntries,
	watchlistWorks,
	listChoices,
	refineEntries,
	workInput
} from '#lib/server/library/list-page.js';
import { listMarks, markKey } from '#lib/server/library/marks.js';
import { getMdblistContext } from '#lib/server/mdblist/index.js';
import {
	getListFilmIds,
	getListFilms,
	getListInfo,
	type MdblistContext
} from '#lib/server/mdblist/service.js';
import type { Actions, PageServerLoad } from './$types';

function listContext(rawId: string): { id: number; context: MdblistContext } {
	const id = parseId(rawId);
	const context = getMdblistContext();
	if (id === undefined || !context) error(404);
	return { id, context };
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { user } = requireUser(locals);
	const { id, context } = listContext(params.id);
	const { options, services } = await listChoices(user.id, url.searchParams);
	const refined = isRefined(options);

	const requested = parseId(url.searchParams.get('page') ?? '1');
	const page =
		!refined && requested !== undefined && requested <= publicListPageMax ? requested : 1;
	const [list, films, opening, ids, genres] = await Promise.all([
		getListInfo(context, id),
		refined ? getListFilms(context, id, 1, listActionMax) : getListFilms(context, id, page),
		page === 1 ? undefined : getListFilms(context, id, 1),
		getListFilmIds(context, id),
		genreChoices()
	]);
	if (!list.ok) error(list.error === 'not_found' ? 404 : 502);
	if (!films.ok) error(films.error === 'not_found' ? 404 : 502);

	let progress: ListProgress | null = null;
	if (ids.ok && ids.value && ids.value.length > 0) {
		const marks = listMarks(context.db, user.id);
		progress = {
			watched: ids.value.filter((work) => marks.get(markKey(work.kind, work.id))?.watched).length,
			total: ids.value.length
		};
	}
	const all = toEntries(
		user.id,
		films.value.films.map((film) => ({ film })),
		(page - 1) * publicListPageSize + 1
	);
	const entries = applyListOptions(await refineEntries(all, options), options);
	const backdropPath = opening?.ok ? opening.value.backdropPath : films.value.backdropPath;
	return {
		list: list.value,
		entries,
		page,
		hasMore: !refined && films.value.hasMore,
		options,
		services,
		decades: listDecades(all),
		genres,
		backdropPath,
		progress,
		liked: likesList(user.id, { public: id })
	};
};

async function listWorks(rawId: string) {
	const { id, context } = listContext(rawId);
	const [list, films] = await Promise.all([
		getListInfo(context, id),
		getListFilms(context, id, 1, listActionMax)
	]);
	if (!list.ok || !films.ok) error(502);
	return { list: list.value, works: films.value.films.map((film) => workInput(film)) };
}

export const actions: Actions = {
	like: async ({ locals, params, request }) => {
		const { user } = requireUser(locals);
		const { id, context } = listContext(params.id);
		const [list, films] = await Promise.all([
			getListInfo(context, id),
			getListFilms(context, id, 1, likedListPreviewSize)
		]);
		if (!list.ok || !films.ok) error(502);
		return likeList(user.id, await request.formData(), {
			target: { public: id },
			name: list.value.name,
			owner: list.value.owner,
			itemCount: list.value.itemCount,
			preview: films.value.films
		});
	},

	clone: async ({ locals, params }) => {
		const { user } = requireUser(locals);
		const { list, works } = await listWorks(params.id);
		const cloned = cloneWorks(user.id, list.name, '', works);
		redirect(303, `/profile/lists/${String(cloned)}`);
	},

	watchlist: async ({ locals, params }) => {
		const { user } = requireUser(locals);
		const { works } = await listWorks(params.id);
		watchlistWorks(user.id, works);
		return { action: 'watchlist' as const, success: true };
	}
};
