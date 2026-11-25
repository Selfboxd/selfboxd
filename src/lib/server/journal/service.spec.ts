import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import { getJournal, type JournalConfig } from './service';

const feed = readFileSync('e2e/support/journal/feed.xml', 'utf8');

describe('journal service', () => {
	let database: TestDatabase;
	let responses: Response[];
	let requestCount: number;
	let delays: number[];
	let config: JournalConfig;

	beforeEach(() => {
		database = createTestDatabase();
		responses = [];
		requestCount = 0;
		delays = [];
		config = {
			feedUrl: 'https://journal.test/rss/',
			fetch: () => {
				requestCount++;
				return Promise.resolve(responses.shift() ?? new Response(feed));
			},
			sleep: (milliseconds) => {
				delays.push(milliseconds);
				return Promise.resolve();
			}
		};
	});

	afterEach(() => {
		database.cleanup();
	});

	it('loads the articles of the feed', async () => {
		const journal = await getJournal(database.db, config);

		expect(journal.ok && journal.articles).toHaveLength(9);
	});

	it('answers from the cache without a second request', async () => {
		await getJournal(database.db, config);

		const journal = await getJournal(database.db, config);

		expect(journal.ok).toBe(true);
		expect(requestCount).toBe(1);
	});

	it('waits for the indicated delay after a 429 response and retries once', async () => {
		responses = [new Response('', { status: 429, headers: { 'retry-after': '3' } })];

		const journal = await getJournal(database.db, config);

		expect(journal.ok).toBe(true);
		expect(delays).toEqual([3000]);
		expect(requestCount).toBe(2);
	});

	it('gives up after a second 429 response', async () => {
		responses = [new Response('', { status: 429 }), new Response('', { status: 429 })];

		expect(await getJournal(database.db, config)).toEqual({ ok: false });
		expect(requestCount).toBe(2);
	});

	it('fails without caching when the feed cannot be read', async () => {
		responses = [new Response('', { status: 503 }), new Response('<html></html>')];

		expect(await getJournal(database.db, config)).toEqual({ ok: false });
		expect(await getJournal(database.db, config)).toEqual({ ok: false });
		expect((await getJournal(database.db, config)).ok).toBe(true);
	});

	it('fails when the request throws', async () => {
		config.fetch = () => Promise.reject(new Error('offline'));

		expect(await getJournal(database.db, config)).toEqual({ ok: false });
	});
});
