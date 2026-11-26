import { error, redirect } from '@sveltejs/kit';
import type { Work } from '#lib/catalog/library.js';
import { applyListOptions, listDecades } from '#lib/catalog/list-view.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { parseId } from '#lib/server/library/forms.js';
import {
	cloneWorks,
	genreChoices,
	likeList,
	likesList,
	progressOf,
	toEntries,
	watchlistWorks,
	listChoices,
	refineEntries,
	shareAction,
	shareItems,
	sharedAddress,
	unshareAction,
	workInput
} from '#lib/server/library/list-page.js';
import { getList } from '#lib/server/library/lists.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { loadWorkDetails } from '#lib/server/library/resolve.js';
import type { Actions, PageServerLoad } from './$types';

/** Loads the TMDB backdrop of a work, or `null` when it cannot be loaded. */
async function loadBackdrop(work: Work | undefined): Promise<string | null> {
	const context = getTmdbContext();
	if (!context || !work) return null;
	const details = await loadWorkDetails(context, work.kind, work.externalId);
	return details.ok ? details.value.backdropPath : null;
}

function ownList(userId: number, rawId: string) {
	const id = parseId(rawId);
	const list = id === undefined ? undefined : getList(getDatabase(), userId, id);
	if (!list) error(404);
	return list;
}

function works(list: ReturnType<typeof ownList>) {
	return list.items.map(({ work, note }) => ({ film: { ...work, id: work.externalId }, note }));
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { user } = requireUser(locals);
	const list = ownList(user.id, params.id);
	const { options, services } = await listChoices(user.id, url.searchParams);
	const all = toEntries(user.id, works(list));
	const [entries, genres, backdropPath] = await Promise.all([
		refineEntries(all, options),
		genreChoices(),
		loadBackdrop(list.items[0]?.work)
	]);
	return {
		list,
		options,
		services,
		entries: applyListOptions(entries, options),
		decades: listDecades(all),
		genres,
		progress: progressOf(all),
		backdropPath,
		liked: likesList(user.id, { personal: list.id }),
		shared: sharedAddress(user.id, { personal: list.id })
	};
};

export const actions: Actions = {
	like: async ({ locals, params, request }) => {
		const { user } = requireUser(locals);
		const list = ownList(user.id, params.id);
		return likeList(user.id, await request.formData(), {
			target: { personal: list.id },
			name: list.name,
			owner: user.username,
			itemCount: list.items.length,
			preview: list.items.map(({ work }) => ({
				id: Number(work.externalId),
				kind: work.kind,
				title: work.title,
				year: work.year,
				posterPath: work.posterPath
			}))
		});
	},

	clone: ({ locals, params }) => {
		const { user } = requireUser(locals);
		const list = ownList(user.id, params.id);
		const cloned = cloneWorks(
			user.id,
			list.name,
			list.description,
			works(list).map(({ film }) => workInput(film))
		);
		redirect(303, `/profile/lists/${String(cloned)}`);
	},

	share: ({ locals, params }) => {
		const { user } = requireUser(locals);
		const list = ownList(user.id, params.id);
		return shareAction(
			user.id,
			{ personal: list.id },
			{
				name: list.name,
				description: list.description,
				owner: user.username,
				ranked: list.ranked,
				items: shareItems(
					works(list).map(({ film }) => workInput(film)),
					list.items.map((item) => item.note)
				)
			}
		);
	},

	unshare: ({ locals, params }) => {
		const { user } = requireUser(locals);
		const list = ownList(user.id, params.id);
		return unshareAction(user.id, { personal: list.id });
	},

	watchlist: ({ locals, params }) => {
		const { user } = requireUser(locals);
		const list = ownList(user.id, params.id);
		watchlistWorks(
			user.id,
			works(list).map(({ film }) => workInput(film))
		);
		return { action: 'watchlist' as const, success: true };
	}
};
