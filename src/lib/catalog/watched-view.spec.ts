import { describe, expect, it } from 'vitest';
import {
	applyWatchedOptions,
	defaultWatchedOptions,
	parseWatchedOptions,
	watchedDecades,
	watchedQuery
} from './watched-view';

const rows = [
	{ work: { title: 'Blade Runner', year: 1982 }, rating: 9, liked: true, genres: ['Drama'] },
	{ work: { title: 'Alien', year: 1979 }, rating: null, liked: false, genres: ['Horror'] },
	{ work: { title: 'Arrival', year: 2016 }, rating: 7, liked: false, genres: ['Drama'] }
];

describe('watched view', () => {
	it('reads and writes its query string, ignoring invalid values', () => {
		const options = parseWatchedOptions(
			new URLSearchParams('rating=9&decade=1980&liked=1&sort=name&size=large&service=8')
		);
		expect(options).toEqual({
			rating: 9,
			decade: 1980,
			genre: null,
			service: 8,
			liked: true,
			sort: 'name',
			size: 'large'
		});
		expect(watchedQuery(options)).toBe(
			'rating=9&decade=1980&service=8&liked=1&sort=name&size=large'
		);
		expect(
			parseWatchedOptions(new URLSearchParams('rating=11&decade=1985&sort=x&size=huge&service=a'))
		).toEqual(defaultWatchedOptions);
		expect(watchedQuery(defaultWatchedOptions)).toBe('');
	});

	it('filters and sorts, keeping the given order by default', () => {
		const titles = (options: Partial<typeof defaultWatchedOptions>) =>
			applyWatchedOptions(rows, { ...defaultWatchedOptions, ...options }).map(
				(row) => row.work.title
			);
		expect(titles({})).toEqual(['Blade Runner', 'Alien', 'Arrival']);
		expect(titles({ sort: 'name' })).toEqual(['Alien', 'Arrival', 'Blade Runner']);
		expect(titles({ sort: 'release_oldest' })).toEqual(['Alien', 'Blade Runner', 'Arrival']);
		expect(titles({ sort: 'rating' })).toEqual(['Blade Runner', 'Arrival', 'Alien']);
		expect(titles({ rating: 'none' })).toEqual(['Alien']);
		expect(titles({ decade: 1970 })).toEqual(['Alien']);
		expect(titles({ genre: 'Drama' })).toEqual(['Blade Runner', 'Arrival']);
		expect(titles({ liked: true })).toEqual(['Blade Runner']);
		expect(watchedDecades(rows)).toEqual([2010, 1980, 1970]);
	});
});
