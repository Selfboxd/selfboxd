import { describe, expect, it } from 'vitest';
import {
	applyListOptions,
	defaultListOptions,
	isRefined,
	listDecades,
	listOptionsQuery,
	parseListOptions,
	type ListEntry
} from './list-view';

function entry(position: number, title: string, year: number | null, extra = {}): ListEntry {
	return {
		film: { id: position, title, year, posterPath: null },
		position,
		note: '',
		watched: false,
		rating: null,
		...extra
	};
}

const entries = [
	entry(1, 'Charlie', 1982, { watched: true, rating: 6, genres: ['Drama'] }),
	entry(2, 'Alpha', 2017, { rating: 9, genres: ['Science Fiction'] }),
	entry(3, 'Bravo', null),
	entry(4, 'Delta', 1985, { watched: true, genres: ['Science Fiction', 'Drama'] })
];

function titles(list: ListEntry[]) {
	return list.map((item) => item.film.title);
}

describe('parseListOptions', () => {
	it('defaults to the order of the list in a grid', () => {
		expect(parseListOptions(new URLSearchParams())).toEqual(defaultListOptions);
	});

	it('reads every option and ignores invalid values', () => {
		expect(
			parseListOptions(
				new URLSearchParams('sort=name&decade=1980&genre=Drama&show=watched&view=detail')
			)
		).toEqual({
			sort: 'name',
			decade: 1980,
			genre: 'Drama',
			visibility: 'watched',
			mode: 'detail'
		});
		expect(
			parseListOptions(
				new URLSearchParams(`sort=x&decade=1985&show=x&view=x&genre=${'a'.repeat(61)}`)
			)
		).toEqual(defaultListOptions);
	});

	it('writes back the same query and tells when the list is refined', () => {
		const query = 'sort=reverse&genre=Science+Fiction&view=detail';
		const options = parseListOptions(new URLSearchParams(query));

		expect(listOptionsQuery(options)).toBe(query);
		expect(isRefined(options)).toBe(true);
		expect(isRefined({ ...defaultListOptions, mode: 'detail' })).toBe(false);
	});
});

describe('applyListOptions', () => {
	it('orders by the list, its reverse, name, year and rating', () => {
		const sorted = (sort: (typeof defaultListOptions)['sort']) =>
			titles(applyListOptions(entries, { ...defaultListOptions, sort }));

		expect(sorted('list')).toEqual(['Charlie', 'Alpha', 'Bravo', 'Delta']);
		expect(sorted('reverse')).toEqual(['Delta', 'Bravo', 'Alpha', 'Charlie']);
		expect(sorted('name')).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
		expect(sorted('newest')).toEqual(['Alpha', 'Delta', 'Charlie', 'Bravo']);
		expect(sorted('oldest')).toEqual(['Charlie', 'Delta', 'Alpha', 'Bravo']);
		expect(sorted('rating')).toEqual(['Alpha', 'Charlie', 'Bravo', 'Delta']);
	});

	it('narrows by decade, genre and what was watched', () => {
		const narrowed = (options: Partial<typeof defaultListOptions>) =>
			titles(applyListOptions(entries, { ...defaultListOptions, ...options }));

		expect(narrowed({ decade: 1980 })).toEqual(['Charlie', 'Delta']);
		expect(narrowed({ genre: 'Science Fiction' })).toEqual(['Alpha', 'Delta']);
		expect(narrowed({ visibility: 'watched' })).toEqual(['Charlie', 'Delta']);
		expect(narrowed({ visibility: 'unwatched', decade: 2010 })).toEqual(['Alpha']);
	});
});

describe('listDecades', () => {
	it('gives each decade once, newest first', () => {
		expect(listDecades(entries)).toEqual([2010, 1980]);
	});
});
