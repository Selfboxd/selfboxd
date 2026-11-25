import { readFileSync } from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';
import { join } from 'node:path';

/** The only key this fake TMDB accepts. */
const validKey = 'valid-test-key';

const bladeRunner = JSON.parse(
	readFileSync(join(import.meta.dirname, 'film-78.json'), 'utf8')
) as Record<string, unknown>;

const journalFeed = readFileSync(join(import.meta.dirname, '../journal/feed.xml'), 'utf8');

const sequel = {
	...bladeRunner,
	id: 335984,
	title: 'Blade Runner 2049',
	original_title: 'Blade Runner 2049',
	release_date: '2017-10-04'
};

const summaries = [bladeRunner, sequel].map((entry: Record<string, unknown>) => ({
	id: entry.id,
	title: entry.title,
	original_title: entry.original_title,
	release_date: entry.release_date,
	poster_path: entry.poster_path
}));

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
	if (request.headers.authorization !== `Bearer ${validKey}`) {
		send(response, 401, { status_code: 7, success: false });
		return;
	}

	const language = url.searchParams.get('language') ?? '';
	const movie = /^\/3\/movie\/(\d+)$/.exec(url.pathname);
	if (url.pathname === '/3/configuration') {
		send(response, 200, {});
	} else if (url.pathname === '/3/movie/500') {
		send(response, 500, {});
	} else if (url.pathname === '/3/movie/429' && count === 1) {
		send(response, 429, {}, { 'retry-after': '1' });
	} else if (movie) {
		const body = film(Number(movie[1]), language);
		send(response, body ? 200 : 404, body ?? { status_code: 34 });
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
			return released >= from && released <= `${until}~`;
		});
		const ordered =
			url.searchParams.get('sort_by') === 'vote_average.asc' ? matching.toReversed() : matching;
		send(response, 200, {
			page,
			total_pages: genre === '878' ? 3 : 1,
			results: page === 1 ? ordered : ordered.slice(0, 1)
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
