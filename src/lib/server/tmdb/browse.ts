import {
	browsePageMax,
	browseSorts,
	firstDecade,
	type BrowseFilter,
	type BrowseSort
} from '../../catalog/browse';

/** Fewest votes a film needs to be ordered by rating. */
const ratingVoteMinimum = 300;

function wholeNumber(value: string | null): number | null {
	return value !== null && /^\d{1,4}$/.test(value) ? Number(value) : null;
}

/** Reads the filter of the browse page from its query string, ignoring invalid values. */
export function parseBrowseFilter(params: URLSearchParams, now = new Date()): BrowseFilter {
	const currentYear = now.getUTCFullYear();
	const sort = browseSorts.find((name) => name === params.get('sort')) ?? 'popular';
	const decade = wholeNumber(params.get('decade'));
	const year = wholeNumber(params.get('year'));
	const page = wholeNumber(params.get('page')) ?? 1;
	return {
		sort,
		decade:
			decade !== null && decade % 10 === 0 && decade >= firstDecade && decade <= currentYear
				? decade
				: null,
		year: year !== null && year >= firstDecade && year <= currentYear + 5 ? year : null,
		genre: wholeNumber(params.get('genre')) || null,
		page: page >= 1 && page <= browsePageMax ? page : 1
	};
}

/** Kinds of works the catalogue can be browsed for. */
export type BrowseKind = 'film' | 'series';

const sortParams: Record<BrowseSort, Record<string, string>> = {
	popular: { sort_by: 'popularity.desc' },
	rating: { sort_by: 'vote_average.desc', 'vote_count.gte': String(ratingVoteMinimum) },
	rating_lowest: { sort_by: 'vote_average.asc', 'vote_count.gte': String(ratingVoteMinimum) },
	name: { sort_by: 'title.asc' },
	upcoming: { sort_by: 'popularity.desc' }
};

/** Parameters of the TMDB discover endpoint for a filter, for films or for series. */
export function discoverParams(
	filter: BrowseFilter,
	now = new Date(),
	kind: BrowseKind = 'film'
): Record<string, string> {
	const date = kind === 'film' ? 'primary_release_date' : 'first_air_date';
	const params: Record<string, string> = {
		include_adult: 'false',
		page: String(filter.page),
		...sortParams[filter.sort]
	};
	if (kind === 'series' && filter.sort === 'name') params.sort_by = 'name.asc';
	if (filter.sort === 'upcoming') {
		params[`${date}.gte`] = now.toISOString().slice(0, 10);
	} else if (filter.year !== null) {
		params[kind === 'film' ? 'primary_release_year' : 'first_air_date_year'] = String(filter.year);
	} else if (filter.decade !== null) {
		params[`${date}.gte`] = `${String(filter.decade)}-01-01`;
		params[`${date}.lte`] = `${String(filter.decade + 9)}-12-31`;
	}
	if (filter.genre !== null) params.with_genres = String(filter.genre);
	return params;
}
