import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import {
	browseSeries,
	getChart,
	getFilm,
	getSeries,
	searchFilms,
	searchSeries,
	type TmdbContext
} from './service';

const filmBody = readFileSync('e2e/support/tmdb/film-78.json', 'utf8');
const seriesBody = readFileSync('e2e/support/tmdb/series-1400.json', 'utf8');

describe('TMDB service', () => {
	let database: TestDatabase;
	let requests: URL[];
	let respond: (url: URL) => Response;
	let context: TmdbContext;

	beforeEach(() => {
		database = createTestDatabase();
		requests = [];
		respond = () => new Response(filmBody);
		context = {
			db: database.db,
			config: {
				baseUrl: 'https://tmdb.test/3',
				apiKey: 'token',
				fetch: (input) => {
					requests.push(input as URL);
					return Promise.resolve(respond(input as URL));
				}
			}
		};
	});

	afterEach(() => {
		database.cleanup();
	});

	it('loads a film', async () => {
		const result = await getFilm(context, 78, 'en-US', 'US');

		expect(result).toMatchObject({ ok: true, value: { title: 'Blade Runner' } });
		expect(requests[0]?.pathname).toBe('/3/movie/78');
	});

	it('answers from the local cache the second time', async () => {
		await getFilm(context, 78, 'en-US', 'US');
		await getFilm(context, 78, 'en-US', 'FR');

		expect(requests).toHaveLength(1);
	});

	it('caches each language separately', async () => {
		await getFilm(context, 78, 'en-US', 'US');
		await getFilm(context, 78, 'fr-FR', 'US');

		expect(requests).toHaveLength(2);
	});

	it('does not cache a failure', async () => {
		respond = () => new Response('{}', { status: 500 });
		expect(await getFilm(context, 78, 'en-US', 'US')).toEqual({ ok: false, error: 'unavailable' });

		respond = () => new Response(filmBody);
		expect((await getFilm(context, 78, 'en-US', 'US')).ok).toBe(true);
	});

	it('rejects a response with an unexpected shape', async () => {
		respond = () => Response.json({ id: 'not-a-film' });

		expect(await getFilm(context, 78, 'en-US', 'US')).toEqual({
			ok: false,
			error: 'invalid_response'
		});
	});

	it('does not call TMDB for an empty search', async () => {
		const result = await searchFilms(context, '   ', 'en-US');

		expect(result).toMatchObject({ ok: true, value: { films: [], total: 0 } });
		expect(requests).toHaveLength(0);
	});

	describe('film search', () => {
		const searchBody = {
			page: 1,
			total_pages: 3,
			total_results: 41,
			results: [
				{
					id: 78,
					title: 'Blade Runner',
					original_title: 'Blade Runner',
					release_date: '1982-06-25',
					poster_path: null
				}
			]
		};

		beforeEach(() => {
			respond = (url) =>
				url.pathname === '/3/search/movie' ? Response.json(searchBody) : new Response(filmBody);
		});

		it('returns the films with their directors', async () => {
			const result = await searchFilms(context, ' Blade Runner ', 'en-US');

			expect(result).toEqual({
				ok: true,
				value: {
					films: [
						{
							id: 78,
							title: 'Blade Runner',
							originalTitle: 'Blade Runner',
							year: 1982,
							posterPath: null,
							directors: [{ id: 578, name: 'Ridley Scott' }]
						}
					],
					total: 41,
					page: 1,
					totalPages: 3
				}
			});
			expect(requests[0]?.searchParams.get('query')).toBe('Blade Runner');
		});

		it('shares the cache between spellings of the same query', async () => {
			await searchFilms(context, ' Blade Runner ', 'en-US');
			const before = requests.length;

			await searchFilms(context, 'blade runner', 'en-US');

			expect(requests).toHaveLength(before);
		});

		it('asks TMDB for the requested page', async () => {
			await searchFilms(context, 'blade', 'en-US', 2);

			expect(requests[0]?.searchParams.get('page')).toBe('2');
		});

		it('lists a film without directors when its details cannot be loaded', async () => {
			respond = (url) =>
				url.pathname === '/3/search/movie'
					? Response.json(searchBody)
					: new Response('{}', { status: 500 });

			const result = await searchFilms(context, 'blade', 'en-US');

			expect(result).toMatchObject({ ok: true, value: { films: [{ id: 78, directors: [] }] } });
		});
	});

	describe('charts', () => {
		const body = {
			page: 2,
			total_pages: 900,
			results: [
				{ id: 1, title: 'No backdrop', release_date: '1999-01-01', poster_path: '/a.jpg' },
				{ id: 2, title: 'Backdrop', backdrop_path: '/b.jpg' }
			]
		};

		beforeEach(() => {
			respond = () => Response.json(body);
		});

		it('asks TMDB for the page of the chart and caps the number of pages', async () => {
			const result = await getChart(context, 'top-rated', 'en-US', 2);

			expect(requests[0]?.pathname).toBe('/3/movie/top_rated');
			expect(requests[0]?.searchParams.get('page')).toBe('2');
			expect(result).toMatchObject({
				ok: true,
				value: { page: 2, totalPages: 25, films: [{ id: 1, year: 1999 }, { id: 2 }] }
			});
		});

		it('gives the backdrop of the first film that has one', async () => {
			const result = await getChart(context, 'popular', 'en-US');

			expect(result.ok && result.value.backdropPath).toBe('/b.jpg');
		});

		it('caches each chart separately', async () => {
			await getChart(context, 'popular', 'en-US');
			await getChart(context, 'popular', 'en-US');
			await getChart(context, 'upcoming', 'en-US');

			expect(requests.map((url) => url.pathname)).toEqual([
				'/3/movie/popular',
				'/3/movie/upcoming'
			]);
		});
	});

	describe('series', () => {
		it('loads a series with its credits, videos and offers', async () => {
			respond = () => new Response(seriesBody);

			const result = await getSeries(context, 1400, 'en-US', 'US');

			expect(result).toMatchObject({ ok: true, value: { title: 'Neon Precinct' } });
			expect(requests[0]?.pathname).toBe('/3/tv/1400');
			expect(requests[0]?.searchParams.get('append_to_response')).toBe(
				'credits,videos,watch/providers'
			);
		});

		it('caches a series apart from a film with the same identifier', async () => {
			respond = (url) => new Response(url.pathname.includes('/tv/') ? seriesBody : filmBody);

			await getSeries(context, 78, 'en-US', 'US');
			await getFilm(context, 78, 'en-US', 'US');

			expect(requests.map((url) => url.pathname)).toEqual(['/3/tv/78', '/3/movie/78']);
		});

		it('searches series and skips the request for an empty query', async () => {
			respond = () =>
				Response.json({
					page: 1,
					total_pages: 1,
					total_results: 1,
					results: [{ id: 1400, name: 'Neon Precinct', original_name: 'Neon Precinct' }]
				});

			expect(await searchSeries(context, '  ', 'en-US')).toMatchObject({
				ok: true,
				value: { series: [] }
			});
			expect(requests).toHaveLength(0);

			const found = await searchSeries(context, 'neon', 'en-US');
			expect(requests[0]?.pathname).toBe('/3/search/tv');
			expect(found).toMatchObject({
				ok: true,
				value: { series: [{ id: 1400, title: 'Neon Precinct', originalTitle: 'Neon Precinct' }] }
			});
		});

		it('browses series with the discover endpoint of series', async () => {
			respond = () => Response.json({ page: 1, total_pages: 900, results: [] });

			const result = await browseSeries(
				context,
				{ sort: 'popular', decade: null, year: null, genre: 80, page: 1 },
				'en-US'
			);

			expect(requests[0]?.pathname).toBe('/3/discover/tv');
			expect(requests[0]?.searchParams.get('with_genres')).toBe('80');
			expect(result).toMatchObject({ ok: true, value: { totalPages: 500 } });
		});
	});
});
