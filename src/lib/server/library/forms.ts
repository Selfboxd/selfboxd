import { reviewMaxLength, watchlistNoteMaxLength } from '../../catalog/library';
import { formText } from '../auth/forms';
import type { DiaryEntryInput } from './diary';
import { parseRating, parseTags, parseViewingDate } from './input';
import type { WatchlistInput } from './watchlist';

export type LibraryFormError =
	'date_invalid' | 'rating_invalid' | 'review_too_long' | 'note_too_long';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: LibraryFormError };

/** Reads a checkbox or a hidden boolean field. */
export function formFlag(form: FormData, name: string): boolean {
	const value = formText(form, name);
	return value === 'true' || value === 'on';
}

/** Reads and validates the fields of the log form. */
export function parseEntryForm(form: FormData): Parsed<DiaryEntryInput> {
	const watchedOn = parseViewingDate(formText(form, 'watchedOn'));
	if (!watchedOn) return { ok: false, error: 'date_invalid' };

	const rating = parseRating(formText(form, 'rating'));
	if (rating === undefined) return { ok: false, error: 'rating_invalid' };

	const review = formText(form, 'review').trim();
	if (review.length > reviewMaxLength) return { ok: false, error: 'review_too_long' };

	return {
		ok: true,
		value: {
			watchedOn,
			rating,
			review,
			liked: formFlag(form, 'liked'),
			rewatch: formFlag(form, 'rewatch'),
			containsSpoilers: review.length > 0 && formFlag(form, 'containsSpoilers'),
			tags: parseTags(formText(form, 'tags'))
		}
	};
}

/** Reads and validates the fields of the watchlist form. */
export function parseWatchlistForm(form: FormData): Parsed<WatchlistInput> {
	const note = formText(form, 'note').trim();
	if (note.length > watchlistNoteMaxLength) return { ok: false, error: 'note_too_long' };
	return { ok: true, value: { note, tags: parseTags(formText(form, 'tags')) } };
}
