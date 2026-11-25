import {
	bioMaxLength,
	listDescriptionMaxLength,
	listNameMaxLength,
	locationMaxLength,
	reviewMaxLength,
	seasonMax,
	seriesStatuses,
	watchlistNoteMaxLength,
	type SeriesStatus
} from '../../catalog/library';
import { formText } from '../auth/forms';
import type { DiaryEntryInput } from './diary';
import type { ListInput } from './lists';
import { parseRating, parseTags, parseViewingDate } from './input';
import type { WatchlistInput } from './watchlist';

export type LibraryFormError =
	| 'date_invalid'
	| 'rating_invalid'
	| 'season_invalid'
	| 'status_invalid'
	| 'review_too_long'
	| 'note_too_long'
	| 'list_name_required'
	| 'list_name_too_long'
	| 'list_description_too_long'
	| 'bio_too_long'
	| 'location_too_long';

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

	const season = parseSeason(formText(form, 'season'));
	if (season === undefined) return { ok: false, error: 'season_invalid' };

	const status = parseStatus(formText(form, 'status'));
	if (status === undefined) return { ok: false, error: 'status_invalid' };

	return {
		ok: true,
		value: {
			watchedOn,
			season,
			status,
			rating,
			review,
			liked: formFlag(form, 'liked'),
			rewatch: formFlag(form, 'rewatch'),
			containsSpoilers: review.length > 0 && formFlag(form, 'containsSpoilers'),
			tags: parseTags(formText(form, 'tags'))
		}
	};
}

/** Reads a season number; an empty value means no season, anything invalid gives `undefined`. */
export function parseSeason(value: string): number | null | undefined {
	if (value === '') return null;
	if (!/^\d{1,3}$/.test(value)) return undefined;
	const season = Number(value);
	return season <= seasonMax ? season : undefined;
}

/** Reads a series status; an empty value keeps the status, anything unknown gives `undefined`. */
export function parseStatus(value: string): SeriesStatus | null | undefined {
	if (value === '') return null;
	return seriesStatuses.find((status) => status === value);
}

/** Reads and validates the fields of the watchlist form. */
export function parseWatchlistForm(form: FormData): Parsed<WatchlistInput> {
	const note = formText(form, 'note').trim();
	if (note.length > watchlistNoteMaxLength) return { ok: false, error: 'note_too_long' };
	return { ok: true, value: { note, tags: parseTags(formText(form, 'tags')) } };
}

/** Reads and validates the fields of the list form. */
export function parseListForm(form: FormData): Parsed<ListInput> {
	const name = formText(form, 'name').trim();
	if (!name) return { ok: false, error: 'list_name_required' };
	if (name.length > listNameMaxLength) return { ok: false, error: 'list_name_too_long' };

	const description = formText(form, 'description').trim();
	if (description.length > listDescriptionMaxLength) {
		return { ok: false, error: 'list_description_too_long' };
	}
	return { ok: true, value: { name, description, ranked: formFlag(form, 'ranked') } };
}

/** Reads a positive identifier from a form field or a route parameter. */
export function parseId(value: string): number | undefined {
	return /^[1-9]\d{0,11}$/.test(value) ? Number(value) : undefined;
}

/** Reads and validates the fields of the profile form. */
export function parseProfileForm(form: FormData): Parsed<{ bio: string; location: string }> {
	const bio = formText(form, 'bio').trim();
	if (bio.length > bioMaxLength) return { ok: false, error: 'bio_too_long' };
	const location = formText(form, 'location').trim();
	if (location.length > locationMaxLength) return { ok: false, error: 'location_too_long' };
	return { ok: true, value: { bio, location } };
}
