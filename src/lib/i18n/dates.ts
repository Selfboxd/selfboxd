import { getLocale } from '#lib/paraglide/runtime.js';

/** Formats a date for display in the current language, independently of the time zone. */
export function formatDate(date: Date): string {
	return new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeZone: 'UTC' }).format(
		date
	);
}
