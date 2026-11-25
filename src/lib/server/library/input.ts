import { ratingMax, ratingMin, tagMaxCount, tagMaxLength } from '../../catalog/library';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

/** Earliest accepted viewing date. */
const earliestDate = '1880-01-01';

const day = 24 * 60 * 60 * 1000;

/**
 * Returns the ISO date when it is a real calendar day that is not in the future.
 * Tomorrow in UTC is accepted, because it is already today in some time zones.
 */
export function parseViewingDate(value: string, now = new Date()): string | undefined {
	if (!isoDatePattern.test(value)) return undefined;
	const date = new Date(`${value}T00:00:00Z`);
	if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return undefined;
	const latest = new Date(now.getTime() + day).toISOString().slice(0, 10);
	return value >= earliestDate && value <= latest ? value : undefined;
}

/** Returns the rating as a whole number of the storage range, `null` for none, `undefined` if invalid. */
export function parseRating(value: string): number | null | undefined {
	if (value === '' || value === '0') return null;
	if (!/^\d{1,2}$/.test(value)) return undefined;
	const rating = Number(value);
	return rating >= ratingMin && rating <= ratingMax ? rating : undefined;
}

/** Splits a comma-separated list into normalized, unique tag names. */
export function parseTags(value: string): string[] {
	const names = value
		.split(',')
		.map((name) => name.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, tagMaxLength))
		.filter((name) => name.length > 0);
	return [...new Set(names)].slice(0, tagMaxCount);
}
