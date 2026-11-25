import { fail, type RequestEvent } from '@sveltejs/kit';
import type { WorkKind } from '../../catalog/library';
import { formText } from '../auth/forms';
import { requireUser } from '../auth/guards';
import { getDatabase } from '../db/index';
import { createDiaryEntry } from './diary';
import { deleteEntryAction, updateEntryAction } from './entry-actions';
import { formFlag, parseEntryForm, parseId, parseWatchlistForm } from './forms';
import { parseRating } from './input';
import { setMembership } from './lists';
import { resolveWork as resolveWorkOf } from './resolve';
import { getWorkState, setLiked, setRating, setWatched } from './states';
import { addToWatchlist, deleteFromWatchlist } from './watchlist';

type WorkEvent = RequestEvent<{ id: string }>;

/** Form actions of the page of a film or a series. */
export function workActions(kind: WorkKind) {
	const resolveWork = (params: { id: string }) => resolveWorkOf(kind, params.id);

	return {
		watch: async ({ locals, request, params }: WorkEvent) => {
			const { user } = requireUser(locals);
			const watched = formFlag(await request.formData(), 'watched');
			const work = await resolveWork(params);
			if (!setWatched(getDatabase(), user.id, work.id, watched)) {
				return fail(409, { action: 'watch' as const, error: 'has_diary_entries' as const });
			}
			return { action: 'watch' as const, success: true };
		},

		like: async ({ locals, request, params }: WorkEvent) => {
			const { user } = requireUser(locals);
			const liked = formFlag(await request.formData(), 'liked');
			const work = await resolveWork(params);
			setLiked(getDatabase(), user.id, work.id, liked);
			return { action: 'like' as const, success: true };
		},

		rate: async ({ locals, request, params }: WorkEvent) => {
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

		watchlist: async ({ locals, request, params }: WorkEvent) => {
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

		lists: async ({ locals, request, params }: WorkEvent) => {
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

		log: async (event: WorkEvent) => {
			const { user } = requireUser(event.locals);
			const form = await event.request.clone().formData();
			if (formText(form, 'entryId')) return updateEntryAction(event);

			const parsed = parseEntryForm(form);
			if (!parsed.ok) return fail(400, { action: 'log' as const, error: parsed.error });
			const input =
				kind === 'series' ? parsed.value : { ...parsed.value, season: null, status: null };
			const work = await resolveWork(event.params);
			createDiaryEntry(getDatabase(), user.id, work.id, input);
			return { action: 'log' as const, success: true };
		},

		deleteEntry: deleteEntryAction
	};
}
