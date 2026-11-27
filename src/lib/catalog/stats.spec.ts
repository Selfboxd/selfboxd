import { describe, expect, it } from 'vitest';
import { computeStats, type StatsInputEntry, type StatsInputWork, type WorkFacts } from './stats';

function facts(overrides: Partial<WorkFacts> = {}): WorkFacts {
	return {
		runtime: 120,
		genres: ['Drama'],
		countries: ['FR'],
		language: 'fr',
		directors: [{ id: 1, name: 'Agnès Varda' }],
		cast: [{ id: 10, name: 'Corinne Marchand' }],
		studios: [{ id: 100, name: 'Rome Paris Films' }],
		...overrides
	};
}

function work(
	id: string,
	year: number,
	rating: number | null,
	extra: Partial<WorkFacts> = {},
	kind: 'film' | 'series' = 'film'
): StatsInputWork {
	return {
		work: { kind, id, title: `Work ${id}`, year, posterPath: `/p${id}.jpg` },
		rating,
		facts: facts(kind === 'series' ? { runtime: null, ...extra } : extra)
	};
}

const works = [
	work('1', 1962, 10),
	work('2', 1985, 8, { genres: ['Drama', 'Comedy'], countries: ['US'], language: 'en' }),
	work('3', 1988, 6, {
		directors: [{ id: 2, name: 'Jim Jarmusch' }],
		cast: [{ id: 10, name: 'Corinne Marchand' }]
	}),
	work('4', 2019, 7, { countries: ['GB'], language: 'en' }, 'series')
];

function entry(index: number, watchedOn: string, extra: Partial<StatsInputEntry> = {}) {
	return { work: index, watchedOn, rating: null, rewatch: false, reviewed: false, ...extra };
}

const entries = [
	entry(0, '2025-12-29', { reviewed: true }),
	entry(0, '2026-01-05', { rewatch: true }),
	entry(1, '2026-01-12'),
	entry(1, '2026-01-12'),
	entry(2, '2026-03-04'),
	entry(3, '2026-03-04')
];

describe('computeStats', () => {
	it('counts the totals of all time', () => {
		const stats = computeStats(works, entries, { year: null, kind: null });

		expect(stats.totals).toEqual({
			works: 4,
			films: 3,
			series: 1,
			hours: 10,
			directors: 2,
			countries: 3,
			entries: 6,
			reviews: 1,
			rewatches: 1,
			average: 7.75,
			streakWeeks: 3,
			streakStart: '2025-12-29',
			busyDays: 2
		});
		expect(stats.diary).toEqual([
			{ label: '2025', count: 1 },
			{ label: '2026', count: 5 }
		]);
		expect(stats.weekdays).toEqual([4, 0, 2, 0, 0, 0, 0]);
		expect(stats.ratings[9]).toBe(1);
		expect(stats.mostWatched.map((item) => [item.work.id, item.count])).toEqual([
			['1', 2],
			['2', 2]
		]);
	});

	it('ranks genres, countries, languages and people, with averages once enough is rated', () => {
		const stats = computeStats(works, entries, { year: null, kind: null });

		expect(stats.genres[0]).toMatchObject({ name: 'Drama', count: 4, average: 7.75 });
		expect(stats.genres[0]?.weighted).toBeCloseTo(
			(7.75 * 4 + 5 * (stats.totals.average ?? 0)) / 9,
			5
		);
		expect(stats.genres[1]).toEqual({ name: 'Comedy', count: 1, average: null, weighted: null });
		expect(stats.languages.map((item) => item.name)).toEqual(['fr', 'en']);
		expect(stats.cast[0]).toEqual({ person: { id: 10, name: 'Corinne Marchand' }, count: 4 });
		expect(stats.directors[0]?.count).toBe(3);
	});

	it('finds the highest rated decades with their best works', () => {
		const stats = computeStats(works, entries, { year: null, kind: null });

		expect(stats.decades.map((decade) => [decade.decade, decade.average])).toEqual([[1980, 7]]);
		expect(stats.decades[0]?.best.map((item) => item.id)).toEqual(['2', '3']);
		expect(stats.posters.length).toBeGreaterThan(0);
		expect(stats.posters.every((work) => work.posterPath !== null)).toBe(true);
	});

	it('keeps the works logged in a year, counted by month', () => {
		const stats = computeStats(works, entries, { year: 2026, kind: null });

		expect(stats.totals.works).toBe(4);
		expect(stats.totals.entries).toBe(5);
		expect(stats.diary).toHaveLength(12);
		expect(stats.diary[0]).toEqual({ label: '01', count: 3 });
		expect(stats.diary[2]).toEqual({ label: '03', count: 2 });
	});

	it('keeps only films or only series', () => {
		expect(computeStats(works, entries, { year: null, kind: 'series' }).totals).toMatchObject({
			works: 1,
			films: 0,
			series: 1,
			hours: 0
		});
		expect(computeStats(works, entries, { year: null, kind: 'film' }).releases[0]).toEqual({
			year: 1962,
			count: 1,
			average: 10
		});
	});

	it('stays empty without anything watched', () => {
		const stats = computeStats([], [], { year: null, kind: null });
		expect(stats.totals.works).toBe(0);
		expect(stats.releases).toEqual([]);
		expect(stats.totals.streakStart).toBeNull();
	});
});
