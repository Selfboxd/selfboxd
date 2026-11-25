import type { Work } from '#lib/catalog/library.js';
import { apiError, apiJson, readJsonObject } from '#lib/server/api/responses.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listLists, listMembership } from '#lib/server/library/lists.js';
import { filmIdPattern } from '#lib/server/library/resolve.js';
import {
	emptyWorkState,
	getWorkState,
	setLiked,
	setRating,
	setWatched
} from '#lib/server/library/states.js';
import { addToWatchlist, deleteFromWatchlist } from '#lib/server/library/watchlist.js';
import { findWork, saveWork } from '#lib/server/library/works.js';
import { ratingMax, ratingMin } from '#lib/catalog/library.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage, requestRegion } from '#lib/server/tmdb/page.js';
import { getFilm } from '#lib/server/tmdb/service.js';
import { tmdbErrorStatus } from '#lib/server/tmdb/status.js';
import type { RequestHandler } from './$types';

function describe(userId: number, work: Work | undefined) {
	const db = getDatabase();
	return {
		state: work ? getWorkState(db, userId, work.id) : emptyWorkState,
		lists: listLists(db, userId).map(({ id, name }) => ({ id, name })),
		listMembership: work ? listMembership(db, userId, work.id) : []
	};
}

export const GET: RequestHandler = ({ locals, params }) => {
	const { user } = requireUser(locals);
	if (!filmIdPattern.test(params.id)) return apiError(404, 'not_found');
	return apiJson(describe(user.id, findWork(getDatabase(), 'film', params.id)));
};

interface StateChange {
	watched?: boolean;
	liked?: boolean;
	rating?: number | null;
	inWatchlist?: boolean;
}

/** Reads the requested changes, or `undefined` when a value has the wrong type or range. */
function parseChange(body: Record<string, unknown>): StateChange | undefined {
	const change: StateChange = {};
	for (const name of ['watched', 'liked', 'inWatchlist'] as const) {
		const value = body[name];
		if (value === undefined) continue;
		if (typeof value !== 'boolean') return undefined;
		change[name] = value;
	}
	const { rating } = body;
	if (rating !== undefined) {
		const valid =
			rating === null ||
			(typeof rating === 'number' &&
				Number.isInteger(rating) &&
				rating >= ratingMin &&
				rating <= ratingMax);
		if (!valid) return undefined;
		change.rating = rating;
	}
	return Object.keys(change).length > 0 ? change : undefined;
}

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const { user } = requireUser(locals);
	if (!filmIdPattern.test(params.id)) return apiError(404, 'not_found');
	const body = await readJsonObject(request);
	const change = body ? parseChange(body) : undefined;
	if (!change) return apiError(400, 'invalid_request');

	const context = getTmdbContext();
	if (!context) return apiError(503, 'tmdb_not_configured');
	const film = await getFilm(context, Number(params.id), requestLanguage(), requestRegion());
	if (!film.ok) return apiError(tmdbErrorStatus(film.error), film.error);

	const db = getDatabase();
	const work = saveWork(db, {
		kind: 'film',
		externalId: params.id,
		title: film.value.title,
		year: film.value.year,
		posterPath: film.value.posterPath
	});
	if (change.watched !== undefined && !setWatched(db, user.id, work.id, change.watched)) {
		return apiError(409, 'has_diary_entries');
	}
	if (change.liked !== undefined) setLiked(db, user.id, work.id, change.liked);
	if (change.rating !== undefined) setRating(db, user.id, work.id, change.rating);
	if (change.inWatchlist === true && !getWorkState(db, user.id, work.id).inWatchlist) {
		addToWatchlist(db, user.id, work.id, { note: '', tags: [] });
	}
	if (change.inWatchlist === false) deleteFromWatchlist(db, user.id, work.id);
	return apiJson(describe(user.id, work));
};
