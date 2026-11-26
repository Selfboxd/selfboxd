import { readFileSync } from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';
import { join } from 'node:path';

/** The only key this fake TMDB accepts. */
const validKey = 'valid-test-key';

const bladeRunner = JSON.parse(
	readFileSync(join(import.meta.dirname, 'film-78.json'), 'utf8')
) as Record<string, unknown>;

const neonPrecinct = JSON.parse(
	readFileSync(join(import.meta.dirname, 'series-1400.json'), 'utf8')
) as Record<string, unknown>;

const harbour = {
	...neonPrecinct,
	id: 1401,
	name: 'Harbour Lights',
	original_name: 'Harbour Lights',
	first_air_date: '2024-09-10',
	status: 'Returning Series'
};

const seriesSummaries = [neonPrecinct, harbour].map((entry: Record<string, unknown>) => ({
	id: entry.id,
	name: entry.name,
	original_name: entry.original_name,
	first_air_date: entry.first_air_date,
	poster_path: entry.poster_path,
	backdrop_path: entry.backdrop_path
}));

const journalFeed = readFileSync(join(import.meta.dirname, '../journal/feed.xml'), 'utf8');

const sequel = {
	...bladeRunner,
	id: 335984,
	title: 'Blade Runner 2049',
	original_title: 'Blade Runner 2049',
	release_date: '2017-10-04',
	'watch/providers': {
		results: {
			US: {
				link: 'https://www.themoviedb.org/movie/335984/watch?locale=US',
				flatrate: [{ provider_id: 11, provider_name: 'Mubi', logo_path: '/mubi.jpg' }]
			}
		}
	}
};

/** Streaming services of each country, as the TMDB provider lists give them. */
const providers: Record<
	string,
	{ provider_id: number; provider_name: string; logo_path: string; display_priority: number }[]
> = {
	US: [
		{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 },
		{ provider_id: 11, provider_name: 'Mubi', logo_path: '/mubi.jpg', display_priority: 2 }
	],
	FR: [{ provider_id: 381, provider_name: 'Canal+', logo_path: '/canal.jpg', display_priority: 1 }]
};

const summaries = [bladeRunner, sequel].map((entry: Record<string, unknown>) => ({
	id: entry.id,
	title: entry.title,
	original_title: entry.original_title,
	release_date: entry.release_date,
	poster_path: entry.poster_path,
	backdrop_path: entry.backdrop_path
}));

const credit = (entry: Record<string, unknown>, extra: Record<string, unknown>) => ({
	...entry,
	vote_count: 10,
	vote_average: 7.5,
	genre_ids: [878],
	...extra
});

/** A director credited on both films and both series, with a talk show left out of pages. */
const ridley = {
	id: 578,
	name: 'Ridley Scott',
	biography: 'An English film director.\n\nHe made Alien and Blade Runner.',
	birthday: '1937-11-30',
	deathday: null,
	place_of_birth: 'South Shields, England',
	profile_path: null,
	known_for_department: 'Directing',
	combined_credits: {
		cast: [
			credit(seriesSummaries[1] ?? {}, {
				media_type: 'tv',
				character: 'Narrator',
				genre_ids: [18]
			}),
			credit(
				{ id: 9900, name: 'Late Night Talk', first_air_date: '2010-01-01', poster_path: null },
				{ media_type: 'tv', character: 'Self', genre_ids: [10767] }
			)
		],
		crew: [
			credit(summaries[0] ?? {}, { media_type: 'movie', job: 'Director', vote_count: 30 }),
			credit(summaries[1] ?? {}, { media_type: 'movie', job: 'Director', vote_count: 50 }),
			credit(summaries[1] ?? {}, { media_type: 'movie', job: 'Producer' }),
			credit(seriesSummaries[0] ?? {}, { media_type: 'tv', job: 'Executive Producer' }),
			credit(summaries[0] ?? {}, { media_type: 'movie', job: 'Thanks' })
		]
	}
};

const companies: Record<string, Record<string, unknown>> = {
	'/3/company/174': { id: 174, name: 'Warner Bros. Pictures', origin_country: 'US' },
	'/3/network/49': { id: 49, name: 'Night Channel', origin_country: 'GB' }
};

/** People found by a search, only for queries of three letters or more. */
function people(query: string) {
	return query.length >= 3 && 'ridley scott'.includes(query)
		? [
				{
					id: 578,
					name: 'Ridley Scott',
					profile_path: null,
					known_for_department: 'Directing',
					known_for: [{ title: 'Blade Runner' }, { title: 'Blade Runner 2049' }]
				}
			]
		: [];
}

/** Number of requests received for each path. */
const requestCounts = new Map<string, number>();

function send(response: ServerResponse, status: number, body: unknown, headers = {}) {
	response.writeHead(status, { 'content-type': 'application/json', ...headers });
	response.end(JSON.stringify(body));
}

function film(id: number, language: string): Record<string, unknown> | undefined {
	switch (id) {
		case 78:
			return bladeRunner;
		case 335984:
			return sequel;
		case 429:
			return { ...bladeRunner, id, title: 'Rate Limited Once' };
		case 666:
			return {
				...bladeRunner,
				id,
				title: '<img src=x onerror=alert(1)>',
				overview: '<script>alert(1)</script>'
			};
		case 9001:
			return { ...bladeRunner, id, title: 'Cached Film', belongs_to_collection: null };
		case 9002:
			return { ...bladeRunner, id, title: `Language ${language}`, belongs_to_collection: null };
		default:
			return undefined;
	}
}

/** The only key the fake MDBList accepts. */
const validListKey = 'valid-mdblist-key';

const publicLists = [
	{ id: 101, name: 'Neon Noir', user_name: 'curator', items: 45, likes: 1200 },
	{ id: 102, name: 'Rainy Cities', user_name: 'curator', items: 2, likes: null },
	{ id: 103, name: '<img src=x onerror=alert(1)>', user_name: null, items: 0, likes: 0 },
	{ id: 104, name: 'Slow Burners', user_name: 'curator', items: 1, likes: 12 },
	{ id: 105, name: 'Replicants', user_name: 'deckard', items: 1, likes: 3 },
	{ id: 106, name: 'Latest TV Shows', user_name: 'curator', items: 2, likes: 1 }
];

function mdblist(url: URL, response: ServerResponse) {
	const path = url.pathname.slice('/mdblist'.length);
	if (url.searchParams.get('apikey') !== validListKey) {
		send(response, 401, { error: 'Invalid API key' });
		return;
	}
	const list = /^\/lists\/(\d+)(\/items)?$/.exec(path);
	if (path === '/user') {
		send(response, 200, { username: 'tester' });
	} else if (path === '/lists/top') {
		send(response, 200, publicLists);
	} else if (path === '/lists/search') {
		const query = (url.searchParams.get('query') ?? '').toLowerCase();
		send(
			response,
			200,
			publicLists.filter((entry) => entry.name.toLowerCase().includes(query))
		);
	} else if (list) {
		const found = publicLists.find((entry) => entry.id === Number(list[1]));
		if (!found) {
			send(response, 404, { error: 'List not found' });
		} else if (!list[2]) {
			send(response, 200, found);
		} else {
			const offset = Number(url.searchParams.get('offset') ?? '0');
			const movies = [
				{ id: 78, title: 'Blade Runner', release_year: 1982, ids: { tmdb: 78 } },
				{ id: 1, title: 'Blade Runner 2049', release_year: 2017, ids: { tmdb: 335984 } },
				{ id: 424242, title: 'Unknown at TMDB', release_year: 1999, ids: { tmdb: 424242 } }
			];
			if (found.id === 106) {
				const show = { id: 7, title: 'Neon Precinct', rank: 1, release_year: 2019 };
				send(response, 200, {
					movies: [{ id: 78, title: 'Blade Runner', rank: 2, ids: { tmdb: 78 } }],
					shows: [{ ...show, ids: { tmdb: 1400 } }]
				});
				return;
			}
			const first = found.id === 101 && offset === 0;
			const later = [{ id: 2, title: 'Cached Film', release_year: 1982, ids: { tmdb: 9001 } }];
			send(
				response,
				200,
				{
					movies: found.id === 103 ? [] : first ? movies : offset > 0 ? later : movies.slice(0, 1),
					shows: []
				},
				{ 'x-has-more': first ? 'true' : 'false' }
			);
		}
	} else {
		send(response, 404, { error: 'Not found' });
	}
}

const server = createServer((request, response) => {
	const url = new URL(request.url ?? '/', 'http://localhost');
	const count = (requestCounts.get(url.pathname) ?? 0) + 1;
	requestCounts.set(url.pathname, count);

	if (url.pathname === '/__requests') {
		send(response, 200, { count: requestCounts.get(url.searchParams.get('path') ?? '') ?? 0 });
		return;
	}
	if (url.pathname === '/journal/rss/') {
		response.writeHead(200, { 'content-type': 'application/rss+xml' });
		response.end(journalFeed);
		return;
	}
	if (url.pathname.startsWith('/mdblist/')) {
		mdblist(url, response);
		return;
	}
	if (request.headers.authorization !== `Bearer ${validKey}`) {
		send(response, 401, { status_code: 7, success: false });
		return;
	}

	const language = url.searchParams.get('language') ?? '';
	const movie = /^\/3\/movie\/(\d+)$/.exec(url.pathname);
	const tv = /^\/3\/tv\/(\d+)$/.exec(url.pathname);
	if (url.pathname === '/3/configuration') {
		send(response, 200, {});
	} else if (url.pathname === '/3/movie/500') {
		send(response, 500, {});
	} else if (url.pathname === '/3/movie/429' && count === 1) {
		send(response, 429, {}, { 'retry-after': '1' });
	} else if (movie) {
		const body = film(Number(movie[1]), language);
		send(response, body ? 200 : 404, body ?? { status_code: 34 });
	} else if (tv) {
		const found = [neonPrecinct, harbour].find((entry) => entry.id === Number(tv[1]));
		send(response, found ? 200 : 404, found ?? { status_code: 34 });
	} else if (url.pathname === '/3/person/578') {
		send(response, 200, {
			...ridley,
			biography: language.startsWith('en') ? ridley.biography : ''
		});
	} else if (companies[url.pathname]) {
		send(response, 200, companies[url.pathname]);
	} else if (url.pathname === '/3/watch/providers/regions') {
		send(response, 200, {
			results: [
				{ iso_3166_1: 'FR', english_name: 'France' },
				{ iso_3166_1: 'US', english_name: 'United States of America' }
			]
		});
	} else if (/^\/3\/watch\/providers\/(movie|tv)$/.test(url.pathname)) {
		send(response, 200, { results: providers[url.searchParams.get('watch_region') ?? ''] ?? [] });
	} else if (url.pathname === '/3/trending/tv/week') {
		send(response, 200, { page: 1, results: seriesSummaries });
	} else if (url.pathname === '/3/genre/tv/list') {
		send(response, 200, {
			genres: [
				{ id: 80, name: 'Crime' },
				{ id: 18, name: 'Drama' }
			]
		});
	} else if (url.pathname === '/3/discover/tv') {
		const genre = url.searchParams.get('with_genres');
		const narrowed = genre === '80' || url.searchParams.has('with_companies');
		const results = narrowed ? seriesSummaries.slice(0, 1) : seriesSummaries;
		send(response, 200, { page: 1, total_pages: 1, total_results: results.length, results });
	} else if (url.pathname === '/3/search/multi') {
		const query = (url.searchParams.get('query') ?? '').toLowerCase();
		const page = Number(url.searchParams.get('page') ?? '1');
		if (query === 'many') {
			const title = `Many ${String(page)}`;
			const results = [
				{ ...summaries[0], id: 7000 + page, title, original_title: title, media_type: 'movie' }
			];
			send(response, 200, { page, total_pages: 2, total_results: 2, results });
			return;
		}
		const results = [
			...seriesSummaries
				.filter((entry) => String(entry.name).toLowerCase().includes(query))
				.map((entry) => ({ ...entry, media_type: 'tv' })),
			...people(query).map((entry) => ({ ...entry, media_type: 'person' })),
			...summaries
				.filter((entry) => String(entry.title).toLowerCase().includes(query))
				.map((entry) => ({ ...entry, media_type: 'movie' }))
		];
		send(response, 200, { page: 1, total_pages: 1, total_results: results.length, results });
	} else if (url.pathname === '/3/search/person') {
		const results = people((url.searchParams.get('query') ?? '').toLowerCase());
		send(response, 200, { page: 1, total_pages: 1, total_results: results.length, results });
	} else if (url.pathname === '/3/search/tv') {
		const query = (url.searchParams.get('query') ?? '').toLowerCase();
		const results = seriesSummaries.filter((entry) =>
			String(entry.name).toLowerCase().includes(query)
		);
		send(response, 200, { page: 1, total_pages: 1, total_results: results.length, results });
	} else if (url.pathname === '/3/collection/422837') {
		send(response, 200, { id: 422837, name: 'Blade Runner Collection', parts: summaries });
	} else if (url.pathname === '/3/genre/movie/list') {
		send(response, 200, {
			genres: [
				{ id: 878, name: 'Science Fiction' },
				{ id: 18, name: 'Drama' }
			]
		});
	} else if (url.pathname === '/3/discover/movie') {
		const from = url.searchParams.get('primary_release_date.gte') ?? '0000';
		const until = url.searchParams.get('primary_release_date.lte') ?? '9999';
		const year = url.searchParams.get('primary_release_year');
		const genre = url.searchParams.get('with_genres');
		const page = Number(url.searchParams.get('page') ?? '1');
		const future = { ...summaries[0], id: 9100, title: 'Future Film', release_date: '2099-01-01' };
		const matching = [...summaries, future].filter((entry) => {
			const released = String(entry.release_date);
			if (genre !== null && (genre !== '878' || entry.id === future.id)) return false;
			if (year !== null && !released.startsWith(year)) return false;
			if (url.searchParams.has('with_companies') && entry.id !== 78) return false;
			if (url.searchParams.get('with_watch_providers') === '8' && entry.id !== 78) return false;
			return released >= from && released <= `${until}~`;
		});
		const ordered =
			url.searchParams.get('sort_by') === 'vote_average.asc' ? matching.toReversed() : matching;
		send(response, 200, {
			page,
			total_pages: genre === '878' ? 3 : 1,
			total_results: genre === '878' ? 41 : matching.length,
			results:
				page === 1 ? ordered : [{ ...summaries[0], id: 9200 + page, title: `Page ${String(page)}` }]
		});
	} else if (/^\/3\/movie\/(popular|top_rated|now_playing|upcoming)$/.test(url.pathname)) {
		const page = Number(url.searchParams.get('page') ?? '1');
		const top = url.pathname.endsWith('top_rated');
		send(response, 200, {
			page,
			total_pages: top ? 2 : 1,
			results: page === 1 ? summaries : [{ ...summaries[0], id: 9001, title: 'Cached Film' }]
		});
	} else if (url.pathname === '/3/trending/movie/week') {
		send(response, 200, { page: 1, results: summaries });
	} else if (url.pathname === '/3/search/movie') {
		const query = (url.searchParams.get('query') ?? '').toLowerCase();
		const page = Number(url.searchParams.get('page') ?? '1');
		if (query === 'many') {
			const title = `Many ${String(page)}`;
			const results = [{ ...summaries[0], id: 7000 + page, title, original_title: title }];
			send(response, 200, { page, total_pages: 2, total_results: 2, results });
			return;
		}
		const results = summaries.filter((entry) => String(entry.title).toLowerCase().includes(query));
		send(response, 200, { page: 1, total_pages: 1, total_results: results.length, results });
	} else {
		send(response, 404, { status_code: 34 });
	}
});

server.listen(Number(process.env.PORT));
