import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import { mdblistGet, type MdblistConfig } from './client';
import {
	getListFilmIds,
	getListFilms,
	getListInfo,
	getTopLists,
	isMdblistKeyValid,
	searchLists,
	type MdblistContext
} from './service';

const filmBody = readFileSync('e2e/support/tmdb/film-78.json', 'utf8');

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
	return Response.json(body, { status, headers });
}

describe('mdblistGet', () => {
	function setup(responses: Response[]) {
		const urls: URL[] = [];
		const sleep = vi.fn(() => Promise.resolve());
		const config: MdblistConfig = {
			baseUrl: 'https://mdblist.test',
			apiKey: 'secret-key',
			sleep,
			fetch: (input) => {
				urls.push(input as URL);
				const response = responses.shift();
				return response ? Promise.resolve(response) : Promise.reject(new Error('offline'));
			}
		};
		return { config, urls, sleep };
	}

	it('sends the key and the parameters in the query string', async () => {
		const { config, urls } = setup([json([])]);

		await mdblistGet(config, '/lists/top', { limit: '9' });

		expect(urls[0]?.toString()).toBe('https://mdblist.test/lists/top?limit=9&apikey=secret-key');
	});

	it('returns the body and whether more pages follow', async () => {
		const { config } = setup([json({ a: 1 }, 200, { 'x-has-more': 'true' })]);

		expect(await mdblistGet(config, '/x')).toEqual({ ok: true, data: { a: 1 }, hasMore: true });
	});

	it('waits for the indicated delay after a 429 response and retries once', async () => {
		const { config, urls, sleep } = setup([json({}, 429, { 'retry-after': '2' }), json([])]);

		expect((await mdblistGet(config, '/x')).ok).toBe(true);
		expect(sleep).toHaveBeenCalledWith(2000);
		expect(urls).toHaveLength(2);
	});

	it('gives up after a second 429 response', async () => {
		const { config, urls } = setup([json({}, 429), json({}, 429), json([])]);

		expect(await mdblistGet(config, '/x')).toEqual({ ok: false, error: 'rate_limited' });
		expect(urls).toHaveLength(2);
	});

	it('maps refusals, missing resources and failures', async () => {
		for (const [status, error] of [
			[401, 'unauthorized'],
			[403, 'unauthorized'],
			[404, 'not_found'],
			[500, 'unavailable']
		] as const) {
			const { config } = setup([json({}, status)]);
			expect(await mdblistGet(config, '/x')).toEqual({ ok: false, error });
		}
		expect(await mdblistGet(setup([]).config, '/x')).toEqual({ ok: false, error: 'unavailable' });
	});
});

describe('MDBList service', () => {
	let database: TestDatabase;
	let requests: string[];
	let context: MdblistContext;

	const lists = [
		{ id: 101, name: 'Neon Noir', user_name: 'curator', items: 45, likes: 1200 },
		{ id: 102, name: 'Rainy Cities', items: null }
	];
	const movies = [
		{ id: 78, title: 'Blade Runner', release_year: 1982, ids: { tmdb: 78 } },
		{ id: 5, title: 'No TMDB', release_year: null }
	];

	beforeEach(() => {
		database = createTestDatabase();
		requests = [];
		context = {
			db: database.db,
			language: 'en-US',
			config: {
				baseUrl: 'https://mdblist.test',
				apiKey: 'key',
				fetch: (input) => {
					const url = input as URL;
					requests.push(url.pathname);
					if (url.pathname === '/user') return Promise.resolve(json({ username: 'me' }));
					if (url.pathname === '/lists/top') return Promise.resolve(json(lists));
					if (url.pathname === '/lists/search') return Promise.resolve(json([lists[0]]));
					if (url.pathname === '/lists/101') return Promise.resolve(json([lists[0]]));
					if (url.pathname === '/lists/102') return Promise.resolve(json(lists[1]));
					if (url.pathname.endsWith('/items')) return Promise.resolve(json({ movies }));
					return Promise.resolve(json({}, 404));
				}
			},
			tmdb: {
				db: database.db,
				config: {
					baseUrl: 'https://tmdb.test/3',
					apiKey: 'token',
					fetch: (input) =>
						Promise.resolve(
							(input as URL).pathname.endsWith('/78') ? new Response(filmBody) : json({}, 404)
						)
				}
			}
		};
	});

	afterEach(() => {
		database.cleanup();
	});

	it('checks a key with the account endpoint', async () => {
		expect(await isMdblistKeyValid(context.config)).toBe(true);
		expect(requests).toEqual(['/user']);
	});

	it('lists films with their TMDB poster and falls back to the MDBList title', async () => {
		const films = await getListFilms(context, 101);

		expect(films.ok && films.value.films).toMatchObject([
			{ id: 78, title: 'Blade Runner', year: 1982, posterPath: expect.any(String) as string },
			{ id: 5, title: 'No TMDB', year: null, posterPath: null }
		]);
	});

	it('lists series with films in the order of their rank', async () => {
		context.config.fetch = () =>
			Promise.resolve(
				json({
					movies: [{ id: 1, title: 'Film', rank: 2, ids: { tmdb: 78 } }],
					shows: [{ id: 2, title: 'Show', rank: 1, ids: { tmdb: 1400 } }]
				})
			);
		context.tmdb = undefined;

		const films = await getListFilms(context, 101);

		expect(films.ok && films.value.films).toEqual([
			{ id: 1400, kind: 'series', title: 'Show', year: null, posterPath: null },
			{ id: 78, kind: 'film', title: 'Film', year: null, posterPath: null }
		]);
	});

	it('gives the backdrop of the first film that has one', async () => {
		const films = await getListFilms(context, 101);

		expect(films.ok && films.value.backdropPath).toBe('/blade-runner-backdrop.jpg');
	});

	it('gives the identifiers of every film of a list that fits in one request', async () => {
		expect(await getListFilmIds(context, 101)).toEqual({
			ok: true,
			value: [
				{ kind: 'film', id: 78 },
				{ kind: 'film', id: 5 }
			]
		});
	});

	it('gives no identifiers when the list continues after the request', async () => {
		context.config.fetch = () => Promise.resolve(json({ movies }, 200, { 'x-has-more': 'true' }));

		expect(await getListFilmIds(context, 101)).toEqual({ ok: true, value: null });
	});

	it('lists films without poster when the instance has no TMDB key', async () => {
		context.tmdb = undefined;

		const films = await getListFilms(context, 101);

		expect(films.ok && films.value.films[0]).toEqual({
			id: 78,
			kind: 'film',
			title: 'Blade Runner',
			year: 1982,
			posterPath: null
		});
	});

	it('returns the top lists with a preview and caches every response', async () => {
		const first = await getTopLists(context);
		const count = requests.length;
		const second = await getTopLists(context);

		expect(first.ok && first.value).toMatchObject([
			{ id: 101, name: 'Neon Noir', owner: 'curator', itemCount: 45, likes: 1200 },
			{ id: 102, name: 'Rainy Cities', owner: null, itemCount: null, likes: null }
		]);
		expect(first.ok && first.value[0]?.preview).toHaveLength(2);
		expect(second).toEqual(first);
		expect(requests).toHaveLength(count);
	});

	it('searches lists and skips the request for an empty query', async () => {
		expect(await searchLists(context, '   ')).toEqual({ ok: true, value: [] });
		expect(requests).toEqual([]);

		const found = await searchLists(context, ' Neon ');

		expect(found.ok && found.value.map((list) => list.name)).toEqual(['Neon Noir']);
	});

	it('reads a list returned alone or inside an array', async () => {
		expect(await getListInfo(context, 101)).toMatchObject({
			ok: true,
			value: { name: 'Neon Noir' }
		});
		expect(await getListInfo(context, 102)).toMatchObject({
			ok: true,
			value: { name: 'Rainy Cities' }
		});
	});

	it('reports a list that does not exist and an unexpected body', async () => {
		expect(await getListInfo(context, 999)).toEqual({ ok: false, error: 'not_found' });
		context.config.fetch = () => Promise.resolve(json({ unexpected: true }));

		expect(await getTopLists(context)).toEqual({ ok: false, error: 'invalid_response' });
	});
});
