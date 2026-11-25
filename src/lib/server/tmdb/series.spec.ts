import { readFileSync } from 'node:fs';
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { seriesDetailsSchema } from './schemas';
import { toSeries, toSeriesSummary } from './series';

const body = JSON.parse(readFileSync('e2e/support/tmdb/series-1400.json', 'utf8')) as Record<
	string,
	unknown
>;
const raw = v.parse(seriesDetailsSchema, body);

describe('toSeries', () => {
	const series = toSeries(raw, 'US');

	it('keeps the header information with the name as title', () => {
		expect(series).toMatchObject({
			id: 1400,
			title: 'Neon Precinct',
			year: 2019,
			creators: [{ id: 501, name: 'Ada Rivers' }],
			networks: ['Night Channel'],
			seasonCount: 2,
			episodeCount: 18,
			trailerKey: 'neonprecinct'
		});
	});

	it('marks an ended series and gives the year of its last episode', () => {
		expect(series).toMatchObject({ ended: true, endYear: 2022 });
		const running = toSeries({ ...raw, status: 'Returning Series' }, 'US');
		expect(running).toMatchObject({ ended: false, endYear: null });
	});

	it('lists the seasons in order with the specials last', () => {
		expect(series.seasons.map((season) => season.number)).toEqual([1, 2, 0]);
		expect(series.seasons[0]).toMatchObject({ year: 2019, episodeCount: 8 });
	});

	it('keeps the directors among the crew', () => {
		expect(series.crew.map((group) => group.job)).toEqual(['Director', 'Executive Producer']);
	});

	it('takes the first known length of an episode', () => {
		expect(series.episodeRuntime).toBe(52);
		expect(toSeries({ ...raw, episode_run_time: [] }, 'US').episodeRuntime).toBeNull();
	});

	it('copes with a series that has almost no data', () => {
		const bare = v.parse(seriesDetailsSchema, {
			id: 1,
			name: 'Bare',
			original_name: 'Bare',
			original_language: 'en',
			vote_average: 0,
			vote_count: 0,
			genres: [],
			credits: { cast: [], crew: [] },
			videos: { results: [] },
			'watch/providers': { results: {} }
		});

		expect(toSeries(bare, 'US')).toMatchObject({
			year: null,
			seasons: [],
			creators: [],
			watch: null,
			ended: false
		});
	});
});

describe('toSeriesSummary', () => {
	it('gives the name as title and the year of the first episode', () => {
		expect(
			toSeriesSummary({ id: 2, name: 'Show', first_air_date: '2001-02-03', poster_path: null })
		).toEqual({ id: 2, title: 'Show', year: 2001, posterPath: null });
	});
});
