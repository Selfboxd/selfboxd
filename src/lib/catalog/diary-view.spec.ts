import { describe, expect, it } from 'vitest';
import {
	applyDiaryOptions,
	defaultDiaryOptions,
	diaryDecades,
	diaryQuery,
	diaryYears,
	parseDiaryOptions,
	type DiaryOptions,
	type DiaryRow
} from './diary-view';

function entry(id: number, changes: Partial<DiaryRow> = {}, year: number | null = 2000): DiaryRow {
	return {
		id,
		work: {
			id,
			kind: 'film',
			externalId: String(id),
			title: `Work ${String(id)}`,
			year,
			posterPath: null
		},
		watchedOn: '2026-01-01',
		season: null,
		rating: null,
		liked: false,
		rewatch: false,
		review: '',
		containsSpoilers: false,
		pinned: false,
		tags: [],
		...changes
	};
}

const entries = [
	entry(1, { watchedOn: '2025-12-30', rating: 9, tags: ['35mm'], genres: ['Drama'] }, 1982),
	entry(2, { watchedOn: '2026-01-02', rewatch: true, review: 'Again.' }, 2017),
	entry(3, { watchedOn: '2026-01-02', rating: 4 }, null)
];

const ids = (change: Partial<DiaryOptions>) =>
	applyDiaryOptions(entries, { ...defaultDiaryOptions, ...change }).map((row) => row.id);

describe('diary options', () => {
	it('reads valid options and ignores the others', () => {
		expect(
			parseDiaryOptions(
				new URLSearchParams(
					'rating=9&year=2025&decade=1980&genre=Drama&service=8&tag=35mm&sort=rating&show=rewatches'
				)
			)
		).toEqual({
			rating: 9,
			year: 2025,
			decade: 1980,
			genre: 'Drama',
			service: 8,
			tag: '35mm',
			sort: 'rating',
			show: 'rewatches'
		});
		expect(
			parseDiaryOptions(new URLSearchParams('rating=11&year=20&decade=1985&sort=x&show=y&tag='))
		).toEqual(defaultDiaryOptions);
		expect(parseDiaryOptions(new URLSearchParams('rating=none')).rating).toBe('none');
	});

	it('leaves default values out of the query', () => {
		expect(diaryQuery(defaultDiaryOptions)).toBe('');
		expect(diaryQuery({ ...defaultDiaryOptions, rating: 'none', year: 2026, sort: 'name' })).toBe(
			'rating=none&year=2026&sort=name'
		);
	});
});

describe('diary entries', () => {
	it('orders by watched date, newest first, by default', () => {
		expect(ids({})).toEqual([3, 2, 1]);
		expect(ids({ sort: 'watched_oldest' })).toEqual([1, 2, 3]);
	});

	it('orders by release year and rating with unknown values last', () => {
		expect(ids({ sort: 'release' })).toEqual([2, 1, 3]);
		expect(ids({ sort: 'release_oldest' })).toEqual([1, 2, 3]);
		expect(ids({ sort: 'rating' })).toEqual([1, 3, 2]);
		expect(ids({ sort: 'rating_lowest' })).toEqual([3, 1, 2]);
	});

	it('narrows by rating, year, decade, genre and tag', () => {
		expect(ids({ rating: 9 })).toEqual([1]);
		expect(ids({ rating: 'none' })).toEqual([2]);
		expect(ids({ year: 2026 })).toEqual([3, 2]);
		expect(ids({ decade: 2010 })).toEqual([2]);
		expect(ids({ genre: 'Drama' })).toEqual([1]);
		expect(ids({ tag: '35mm' })).toEqual([1]);
		expect(
			applyDiaryOptions(
				entries.map((row) => ({ ...row, services: row.id === 3 ? [8] : [] })),
				{ ...defaultDiaryOptions, service: 8 }
			).map((row) => row.id)
		).toEqual([3]);
	});

	it('narrows by how the work was watched', () => {
		expect(ids({ show: 'rewatches' })).toEqual([2]);
		expect(ids({ show: 'first' })).toEqual([3, 1]);
		expect(ids({ show: 'reviews' })).toEqual([2]);
	});

	it('lists the years and the decades, newest first', () => {
		expect(diaryYears(entries)).toEqual([2026, 2025]);
		expect(diaryDecades(entries)).toEqual([2010, 1980]);
	});
});
