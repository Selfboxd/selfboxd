import type { WorkKind } from '../catalog/library';
import { m } from '../paraglide/messages.js';
import { getLocale } from '../paraglide/runtime.js';

interface CountParts {
	total: number;
	/** Name of the genre the works are narrowed to. */
	genre: string | null;
	decade: number | null;
	year: number | null;
}

/** Says how many films or series match a browse filter, such as "There are 79,088 films." */
export function browseCount(kind: WorkKind, { total, genre, decade, year }: CountParts): string {
	const count = new Intl.NumberFormat(getLocale()).format(total);
	const series = kind === 'series';
	if (genre !== null && year !== null) {
		return (series ? m.series_count_genre_year : m.browse_count_genre_year)({
			count,
			genre,
			year: String(year)
		});
	}
	if (genre !== null && decade !== null) {
		return (series ? m.series_count_genre_decade : m.browse_count_genre_decade)({
			count,
			genre,
			decade: String(decade)
		});
	}
	if (genre !== null)
		return (series ? m.series_count_genre : m.browse_count_genre)({ count, genre });
	if (year !== null) {
		return (series ? m.series_count_year : m.browse_count_year)({ count, year: String(year) });
	}
	if (decade !== null) {
		return (series ? m.series_count_decade : m.browse_count_decade)({
			count,
			decade: String(decade)
		});
	}
	return (series ? m.series_count_all : m.browse_count_all)({ count });
}
