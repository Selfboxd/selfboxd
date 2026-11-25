import { error, fail, type RequestEvent } from '@sveltejs/kit';
import type { Work } from '#lib/catalog/library.js';
import { formText } from '#lib/server/auth/forms.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { createDiaryEntry, listDiaryEntries } from '#lib/server/library/diary.js';
import { deleteEntryAction, updateEntryAction } from '#lib/server/library/entry-actions.js';
import {
	formFlag,
	parseEntryForm,
	parseId,
	parseWatchlistForm
} from '#lib/server/library/forms.js';
import { parseRating } from '#lib/server/library/input.js';
import { listLists, listMembership, setMembership } from '#lib/server/library/lists.js';
import {
	emptyWorkState,
	getWorkState,
	setLiked,
	setRating,
	setWatched
} from '#lib/server/library/states.js';
import {
	addToWatchlist,
	deleteFromWatchlist,
	findWatchlistItem
} from '#lib/server/library/watchlist.js';
import { findWork, saveWork } from '#lib/server/library/works.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage, requestRegion } from '#lib/server/tmdb/page.js';
import { getCollection, getFilm } from '#lib/server/tmdb/service.js';
import type { Actions, PageServerLoad } from './$types';

const filmIdPattern = /^\d{1,9}$/;

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!filmIdPattern.test(params.id)) error(404);
	const { user } = requireUser(locals);
	const context = getTmdbContext();
	if (!context) return { state: 'not_configured' as const };

	const language = requestLanguage();
	const film = await getFilm(context, Number(params.id), language, requestRegion());
	if (!film.ok) {
		if (film.error === 'not_found') error(404);
		return { state: 'error' as const, error: film.error };
	}

	const collection = film.value.collection
		? await getCollection(context, film.value.collection.id, language)
		: undefined;
	const related = collection?.ok
		? {
				name: collection.value.name,
				films: collection.value.films.filter((other) => other.id !== film.value.id)
			}
		: null;

	const db = getDatabase();
	const work = findWork(db, 'film', params.id);
	return {
		state: 'ready' as const,
		film: film.value,
		related,
		library: {
			state: work ? getWorkState(db, user.id, work.id) : emptyWorkState,
			entries: work ? listDiaryEntries(db, user.id, work.id) : [],
			watchlist: work ? (findWatchlistItem(db, user.id, work.id) ?? null) : null,
			lists: listLists(db, user.id).map(({ id, name }) => ({ id, name })),
			listMembership: work ? listMembership(db, user.id, work.id) : []
		}
	};
};

/** Stores the film of the page as a work, so that the account can act on it. */
async function resolveWork(params: { id: string }): Promise<Work> {
	if (!filmIdPattern.test(params.id)) error(404);
	const context = getTmdbContext();
	if (!context) error(503);
	const film = await getFilm(context, Number(params.id), requestLanguage(), requestRegion());
	if (!film.ok) error(film.error === 'not_found' ? 404 : 502);
	return saveWork(getDatabase(), {
		kind: 'film',
		externalId: params.id,
		title: film.value.title,
		year: film.value.year,
		posterPath: film.value.posterPath
	});
}

type FilmEvent = RequestEvent<{ id: string }>;

export const actions: Actions = {
	watch: async ({ locals, request, params }: FilmEvent) => {
		const { user } = requireUser(locals);
		const watched = formFlag(await request.formData(), 'watched');
		const work = await resolveWork(params);
		if (!setWatched(getDatabase(), user.id, work.id, watched)) {
			return fail(409, { action: 'watch' as const, error: 'has_diary_entries' as const });
		}
		return { action: 'watch' as const, success: true };
	},

	like: async ({ locals, request, params }: FilmEvent) => {
		const { user } = requireUser(locals);
		const liked = formFlag(await request.formData(), 'liked');
		const work = await resolveWork(params);
		setLiked(getDatabase(), user.id, work.id, liked);
		return { action: 'like' as const, success: true };
	},

	rate: async ({ locals, request, params }: FilmEvent) => {
		const { user } = requireUser(locals);
		const rating = parseRating(formText(await request.formData(), 'rating'));
		if (rating === undefined)
			return fail(400, { action: 'rate' as const, error: 'rating_invalid' as const });
		const work = await resolveWork(params);
		const db = getDatabase();
		const current = getWorkState(db, user.id, work.id).rating;
		setRating(db, user.id, work.id, rating === current ? null : rating);
		return { action: 'rate' as const, success: true };
	},

	watchlist: async ({ locals, request, params }: FilmEvent) => {
		const { user } = requireUser(locals);
		const form = await request.formData();
		const work = await resolveWork(params);
		if (!formFlag(form, 'listed')) {
			deleteFromWatchlist(getDatabase(), user.id, work.id);
			return { action: 'watchlist' as const, success: true };
		}
		const parsed = parseWatchlistForm(form);
		if (!parsed.ok) return fail(400, { action: 'watchlist' as const, error: parsed.error });
		addToWatchlist(getDatabase(), user.id, work.id, parsed.value);
		return { action: 'watchlist' as const, success: true };
	},

	lists: async ({ locals, request, params }: FilmEvent) => {
		const { user } = requireUser(locals);
		const form = await request.formData();
		const listIds = form
			.getAll('listId')
			.flatMap((value) => (typeof value === 'string' ? [parseId(value)] : []))
			.filter((id) => id !== undefined);
		const work = await resolveWork(params);
		setMembership(getDatabase(), user.id, work.id, listIds);
		return { action: 'lists' as const, success: true };
	},

	log: async (event: FilmEvent) => {
		const { user } = requireUser(event.locals);
		const form = await event.request.clone().formData();
		if (formText(form, 'entryId')) return updateEntryAction(event);

		const parsed = parseEntryForm(form);
		if (!parsed.ok) return fail(400, { action: 'log' as const, error: parsed.error });
		const work = await resolveWork(event.params);
		createDiaryEntry(getDatabase(), user.id, work.id, parsed.value);
		return { action: 'log' as const, success: true };
	},

	deleteEntry: deleteEntryAction
};
