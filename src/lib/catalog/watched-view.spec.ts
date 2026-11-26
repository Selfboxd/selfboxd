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
			new URLSearchParams('rating=9-5&decade=1980&liked=1&sort=name&service=8')
		);
		expect(options).toEqual({
			rating: { min: 5, max: 9 },
			decade: 1980,
			genre: null,
			service: 8,
			liked: true,
			sort: 'name'
		});
		expect(watchedQuery(options)).toBe('rating=5-9&decade=1980&service=8&liked=1&sort=name');
		expect(watchedQuery({ ...options, rating: { min: 7, max: 7 } })).toContain('rating=7&');
		expect(
			parseWatchedOptions(new URLSearchParams('rating=11&decade=1985&sort=x&service=a'))
		).toEqual(defaultWatchedOptions);
		expect(parseWatchedOptions(new URLSearchParams('rating=none')).rating).toBe('none');
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
		expect(titles({ rating: { min: 7, max: 9 } })).toEqual(['Blade Runner', 'Arrival']);
		expect(titles({ rating: { min: 8, max: 8 } })).toEqual([]);
		expect(titles({ rating: { min: 7, max: 9 } })).toEqual(['Blade Runner', 'Arrival']);
		expect(titles({ rating: { min: 8, max: 8 } })).toEqual([]);
		expect(titles({ decade: 1970 })).toEqual(['Alien']);
		expect(titles({ genre: 'Drama' })).toEqual(['Blade Runner', 'Arrival']);
		expect(titles({ liked: true })).toEqual(['Blade Runner']);
		expect(watchedDecades(rows)).toEqual([2010, 1980, 1970]);
	});
});
