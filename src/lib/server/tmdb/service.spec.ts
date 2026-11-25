import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import { getFilm, searchFilms, type TmdbContext } from './service';

const filmBody = readFileSync('e2e/support/tmdb/film-78.json', 'utf8');

describe('TMDB service', () => {
	let database: TestDatabase;
	let requests: URL[];
	let respond: () => Response;
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
					return Promise.resolve(respond());
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

		expect(result).toEqual({ ok: true, value: { films: [], total: 0 } });
		expect(requests).toHaveLength(0);
	});

	it('searches films and shares the cache between spellings of the same query', async () => {
		respond = () =>
			Response.json({
				page: 1,
				total_pages: 1,
				total_results: 1,
				results: [{ id: 78, title: 'Blade Runner', release_date: '1982-06-25', poster_path: null }]
			});

		const result = await searchFilms(context, ' Blade Runner ', 'en-US');
		await searchFilms(context, 'blade runner', 'en-US');

		expect(result).toEqual({
			ok: true,
			value: { films: [{ id: 78, title: 'Blade Runner', year: 1982, posterPath: null }], total: 1 }
		});
		expect(requests).toHaveLength(1);
		expect(requests[0]?.searchParams.get('query')).toBe('Blade Runner');
	});
});
