import { describe, expect, it } from 'vitest';
import type { WatchlistItem } from './library';
import {
	applyWatchlistOptions,
	defaultWatchlistOptions,
	parseWatchlistOptions,
	watchlistDecades,
	watchlistQuery
} from './watchlist-view';

function item(
	id: number,
	kind: 'film' | 'series',
	year: number | null,
	added: string,
	tags: string[] = []
): WatchlistItem {
	return {
		work: { id, kind, externalId: String(id), title: `Work ${String(id)}`, year, posterPath: null },
		note: '',
		tags,
		addedAt: new Date(added)
	};
}

const items = [
	item(1, 'film', 1982, '2026-01-01', ['classic']),
	item(2, 'series', 2019, '2026-03-01'),
	item(3, 'film', null, '2026-02-01')
];

describe('watchlist options', () => {
	it('reads valid options and ignores the rest', () => {
		expect(parseWatchlistOptions(new URLSearchParams('kind=series&decade=1980&sort=name'))).toEqual(
			{
				...defaultWatchlistOptions,
				kind: 'series',
				decade: 1980,
				sort: 'name'
			}
		);
		expect(parseWatchlistOptions(new URLSearchParams('kind=book&decade=1985&sort=x'))).toEqual(
			defaultWatchlistOptions
		);
	});

	it('leaves default values out of the query string', () => {
		expect(watchlistQuery(defaultWatchlistOptions)).toBe('');
		expect(watchlistQuery({ ...defaultWatchlistOptions, kind: 'film', tag: 'classic' })).toBe(
			'kind=film&tag=classic'
		);
	});

	it('keeps the latest additions first by default, and filters by kind, decade and tag', () => {
		expect(applyWatchlistOptions(items, defaultWatchlistOptions).map((row) => row.work.id)).toEqual(
			[2, 3, 1]
		);
		const only = (change: object) =>
			applyWatchlistOptions(items, { ...defaultWatchlistOptions, ...change }).map(
				(row) => row.work.id
			);
		expect(only({ kind: 'film' })).toEqual([3, 1]);
		expect(only({ decade: 1980 })).toEqual([1]);
		expect(only({ tag: 'classic' })).toEqual([1]);
		expect(only({ sort: 'release' })).toEqual([2, 1, 3]);
	});

	it('lists the decades of the works, newest first', () => {
		expect(watchlistDecades(items)).toEqual([2010, 1980]);
	});
});
