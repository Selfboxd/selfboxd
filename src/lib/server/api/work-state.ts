import type { RequestEvent } from '@sveltejs/kit';
import type { Work, WorkKind } from '../../catalog/library';
import { apiError, apiJson, readJsonObject } from './responses';
import { requireUser } from '../auth/guards';
import { getDatabase } from '../db/index';
import { listLists, listMembership } from '../library/lists';
import { filmIdPattern, loadWorkDetails, saveDetails } from '../library/resolve';
import { emptyWorkState, getWorkState, setLiked, setRating, setWatched } from '../library/states';
import { addToWatchlist, deleteFromWatchlist } from '../library/watchlist';
import { findWork } from '../library/works';
import { ratingMax, ratingMin } from '../../catalog/library';
import { getTmdbContext } from '../tmdb/index';
import { tmdbErrorStatus } from '../tmdb/status';

function describe(userId: number, work: Work | undefined) {
	const db = getDatabase();
	return {
		state: work ? getWorkState(db, userId, work.id) : emptyWorkState,
		lists: listLists(db, userId).map(({ id, name }) => ({ id, name })),
		listMembership: work ? listMembership(db, userId, work.id) : []
	};
}

type StateEvent = Pick<RequestEvent<{ id: string }>, 'locals' | 'params' | 'request'>;

/** Answers with the state of a film or a series for the signed-in account. */
export function getState(kind: WorkKind, { locals, params }: StateEvent): Response {
	const { user } = requireUser(locals);
	if (!filmIdPattern.test(params.id)) return apiError(404, 'not_found');
	return apiJson(describe(user.id, findWork(getDatabase(), kind, params.id)));
}

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

/** Changes the state of a film or a series for the signed-in account. */
export async function patchState(
	kind: WorkKind,
	{ locals, params, request }: StateEvent
): Promise<Response> {
	const { user } = requireUser(locals);
	if (!filmIdPattern.test(params.id)) return apiError(404, 'not_found');
	const body = await readJsonObject(request);
	const change = body ? parseChange(body) : undefined;
	if (!change) return apiError(400, 'invalid_request');

	const context = getTmdbContext();
	if (!context) return apiError(503, 'tmdb_not_configured');
	const details = await loadWorkDetails(context, kind, params.id);
	if (!details.ok) return apiError(tmdbErrorStatus(details.error), details.error);

	const db = getDatabase();
	const work = saveDetails(kind, details.value);
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
}
