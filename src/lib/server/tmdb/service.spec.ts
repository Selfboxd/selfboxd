import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import {
	browseFilms,
	browseSeries,
	getChart,
	getImages,
	getPerson,
	getRegions,
	getServices,
	getStudio,
	getFilm,
	getSeries,
	searchFilms,
	searchWorks,
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
							directors: [{ id: 578, name: 'Ridley Scott' }],
							alternativeTitles: ['Der Blade Runner', 'ブレードランナー']
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
				'credits,videos,watch/providers,alternative_titles'
			);
		});

		it('caches a series apart from a film with the same identifier', async () => {
			respond = (url) => new Response(url.pathname.includes('/tv/') ? seriesBody : filmBody);

			await getSeries(context, 78, 'en-US', 'US');
			await getFilm(context, 78, 'en-US', 'US');

			expect(requests.map((url) => url.pathname)).toEqual(['/3/tv/78', '/3/movie/78']);
		});

		it('searches films, series and people together, most relevant first', async () => {
			respond = (url) => {
				if (url.pathname === '/3/search/multi') {
					return Response.json({
						page: 1,
						total_pages: 1,
						total_results: 3,
						results: [
							{ id: 1400, media_type: 'tv', name: 'Neon Precinct', original_name: 'Neon Precinct' },
							{
								id: 9,
								media_type: 'person',
								name: 'Someone',
								known_for_department: 'Directing',
								known_for: [{ title: 'Blade Runner' }, { name: 'Neon Precinct' }]
							},
							{ id: 78, media_type: 'movie', title: 'Blade Runner', release_date: '1982-06-25' }
						]
					});
				}
				return new Response(url.pathname.includes('/tv/') ? seriesBody : filmBody);
			};

			const found = await searchWorks(context, 'neon', 'en-US');

			expect(found).toMatchObject({
				ok: true,
				value: {
					results: [
						{ kind: 'series', id: 1400, people: [{ name: 'Ada Rivers' }] },
						{
							kind: 'person',
							id: 9,
							name: 'Someone',
							department: 'Directing',
							knownFor: ['Blade Runner', 'Neon Precinct']
						},
						{ kind: 'film', id: 78, year: 1982, people: [{ name: 'Ridley Scott' }] }
					]
				}
			});
			expect(requests[0]?.pathname).toBe('/3/search/multi');
			expect(requests.map((url) => url.pathname)).not.toContain('/3/person/9');
		});

		it('searches people only', async () => {
			respond = () =>
				Response.json({
					page: 1,
					total_pages: 1,
					total_results: 1,
					results: [{ id: 578, name: 'Ridley Scott', profile_path: '/r.jpg' }]
				});

			const found = await searchWorks(context, 'ridley', 'en-US', 1, 'person');

			expect(requests.map((url) => url.pathname)).toEqual(['/3/search/person']);
			expect(found).toMatchObject({
				ok: true,
				value: { results: [{ kind: 'person', id: 578, profilePath: '/r.jpg', knownFor: [] }] }
			});
		});

		it('searches series only, and skips the request for an empty query', async () => {
			respond = (url) =>
				url.pathname === '/3/search/tv'
					? Response.json({
							page: 1,
							total_pages: 1,
							total_results: 1,
							results: [{ id: 1400, name: 'Neon Precinct', original_name: 'Neon Precinct' }]
						})
					: new Response(seriesBody);

			expect(await searchWorks(context, '  ', 'en-US', 1, 'series')).toMatchObject({
				ok: true,
				value: { results: [] }
			});
			expect(requests).toHaveLength(0);

			const found = await searchWorks(context, 'neon', 'en-US', 1, 'series');
			expect(requests[0]?.pathname).toBe('/3/search/tv');
			expect(found).toMatchObject({
				ok: true,
				value: { results: [{ kind: 'series', title: 'Neon Precinct' }] }
			});
		});

		it('browses series with the discover endpoint of series', async () => {
			respond = () => Response.json({ page: 1, total_pages: 900, results: [] });

			const result = await browseSeries(
				context,
				{ sort: 'popular', decade: null, year: null, genre: 80, service: null, page: 1 },
				'en-US'
			);

			expect(requests[0]?.pathname).toBe('/3/discover/tv');
			expect(requests[0]?.searchParams.get('with_genres')).toBe('80');
			expect(result).toMatchObject({ ok: true, value: { totalPages: 500 } });
		});
	});

	describe('people and companies', () => {
		const person = {
			id: 578,
			name: 'Ridley Scott',
			biography: '',
			known_for_department: 'Directing',
			combined_credits: {
				cast: [],
				crew: [{ id: 78, media_type: 'movie', title: 'Blade Runner', job: 'Director' }]
			}
		};

		it('loads a person with their credits', async () => {
			respond = () => Response.json({ ...person, biography: 'A director.' });

			const result = await getPerson(context, 578, 'en-US');

			expect(requests[0]?.pathname).toBe('/3/person/578');
			expect(requests[0]?.searchParams.get('append_to_response')).toBe('combined_credits');
			expect(result).toMatchObject({
				ok: true,
				value: { name: 'Ridley Scott', credits: [{ id: 78, role: 'director' }] }
			});
			expect(requests).toHaveLength(1);
		});

		it('takes the English biography when none exists in the language', async () => {
			respond = (url) =>
				Response.json(
					url.searchParams.get('language') === 'en-US'
						? { ...person, biography: 'A director.' }
						: person
				);

			const result = await getPerson(context, 578, 'fr-FR');

			expect(result).toMatchObject({ ok: true, value: { biography: 'A director.' } });
			expect(requests.map((url) => url.searchParams.get('language'))).toEqual(['fr-FR', 'en-US']);
		});

		it('loads a studio and a network from their own paths', async () => {
			respond = (url) => Response.json({ id: 1, name: url.pathname });

			expect(await getStudio(context, 'studio', 174)).toMatchObject({
				ok: true,
				value: { name: '/3/company/174' }
			});
			expect(await getStudio(context, 'network', 49)).toMatchObject({
				ok: true,
				value: { name: '/3/network/49' }
			});
		});

		it('narrows a browse to a studio or a network', async () => {
			respond = () => Response.json({ page: 1, total_pages: 1, results: [] });
			const filter = {
				sort: 'popular',
				decade: null,
				year: null,
				genre: null,
				service: null,
				page: 1
			} as const;

			await browseFilms(context, filter, 'en-US', { studio: 174 });
			await browseSeries(context, filter, 'en-US', { network: 49 });
			await browseFilms(context, filter, 'en-US');

			expect(requests[0]?.searchParams.get('with_companies')).toBe('174');
			expect(requests[1]?.searchParams.get('with_networks')).toBe('49');
			expect(requests[2]?.searchParams.has('with_companies')).toBe(false);
		});
	});

	describe('streaming', () => {
		it('lists the countries by name', async () => {
			respond = () =>
				Response.json({
					results: [
						{ iso_3166_1: 'US', english_name: 'United States' },
						{ iso_3166_1: 'FR', english_name: 'France' }
					]
				});

			expect(await getRegions(context, 'en-US')).toEqual({
				ok: true,
				value: [
					{ code: 'FR', name: 'France' },
					{ code: 'US', name: 'United States' }
				]
			});
		});

		it('merges the services of films and series of a country, most common first', async () => {
			respond = (url) =>
				Response.json({
					results:
						url.pathname === '/3/watch/providers/movie'
							? [
									{
										provider_id: 8,
										provider_name: 'Netflix',
										logo_path: '/n.jpg',
										display_priority: 2
									},
									{ provider_id: 11, provider_name: 'Mubi', display_priority: 5 }
								]
							: [
									{
										provider_id: 8,
										provider_name: 'Netflix',
										logo_path: '/n.jpg',
										display_priority: 1
									}
								]
				});

			const services = await getServices(context, 'FR', 'fr-FR');

			expect(services).toEqual({
				ok: true,
				value: [
					{ id: 8, name: 'Netflix', logoPath: '/n.jpg' },
					{ id: 11, name: 'Mubi', logoPath: null }
				]
			});
			expect(requests.map((url) => url.searchParams.get('watch_region'))).toEqual(['FR', 'FR']);
		});
	});

	it('narrows a browse to a streaming service in a country', async () => {
		respond = () => Response.json({ page: 1, total_pages: 1, results: [] });
		await browseFilms(
			context,
			{ sort: 'popular', decade: null, year: null, genre: null, service: null, page: 1 },
			'en-US',
			{ service: { id: 8, region: 'FR' } }
		);

		expect(requests[0]?.searchParams.get('with_watch_providers')).toBe('8');
		expect(requests[0]?.searchParams.get('watch_region')).toBe('FR');
		expect(requests[0]?.searchParams.get('with_watch_monetization_types')).toBe('flatrate');
	});

	it('loads the posters and backdrops of a work in the language of the user and English', async () => {
		respond = () =>
			Response.json({
				posters: [{ file_path: '/p.jpg', width: 500, height: 750 }],
				backdrops: [{ file_path: '/b.jpg' }]
			});

		const images = await getImages(context, 'series', 1400, 'fr-FR');

		expect(requests[0]?.pathname).toBe('/3/tv/1400/images');
		expect(requests[0]?.searchParams.get('include_image_language')).toBe('fr,en,null');
		expect(images).toEqual({
			ok: true,
			value: {
				posters: [{ path: '/p.jpg', width: 500, height: 750 }],
				backdrops: [{ path: '/b.jpg', width: 0, height: 0 }]
			}
		});
	});
});
