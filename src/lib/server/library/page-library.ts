import type { WorkKind } from '../../catalog/library';
import { getDatabase } from '../db/index';
import { listDiaryEntries } from './diary';
import { listLists, listMembership } from './lists';
import { emptyWorkState, getWorkState } from './states';
import { findWatchlistItem } from './watchlist';
import { findWork } from './works';

/** What the page of a film or a series shows about the account and the work. */
export function loadLibrary(userId: number, kind: WorkKind, externalId: string) {
	const db = getDatabase();
	const work = findWork(db, kind, externalId);
	return {
		state: work ? getWorkState(db, userId, work.id) : emptyWorkState,
		entries: work ? listDiaryEntries(db, userId, work.id) : [],
		watchlist: work ? (findWatchlistItem(db, userId, work.id) ?? null) : null,
		lists: listLists(db, userId).map(({ id, name }) => ({ id, name })),
		listMembership: work ? listMembership(db, userId, work.id) : []
	};
}
