import type { Article } from '../../catalog/journal';
import type { AppDatabase } from '../db/connection';
import { readCache, writeCache } from '../tmdb/cache';
import { parseFeed } from './feed';

export interface JournalConfig {
	/** Address of the RSS feed. */
	feedUrl: string;
	fetch?: typeof fetch;
	/** Waits for the given number of milliseconds. Replaced in tests. */
	sleep?: (milliseconds: number) => Promise<void>;
}

export type JournalResult = { ok: true; articles: Article[] } | { ok: false };

const cacheKey = 'journal:feed';

/** Time the articles are kept before the feed is read again, in milliseconds. */
const cacheTtl = 60 * 60 * 1000;

/** Longest time the request may take, in milliseconds. */
const requestTimeout = 10_000;

/** Longest wait honoured after a 429 response, in milliseconds. */
const maxRetryDelay = 10_000;

/** Largest feed accepted, in characters. */
const maxFeedLength = 2_000_000;

function defaultSleep(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function retryDelay(response: Response): number {
	const seconds = Number(response.headers.get('retry-after'));
	const delay = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000;
	return Math.min(delay, maxRetryDelay);
}

async function fetchFeed(config: JournalConfig): Promise<string | undefined> {
	const send = config.fetch ?? fetch;
	const sleep = config.sleep ?? defaultSleep;
	const request = () =>
		send(config.feedUrl, {
			headers: { accept: 'application/rss+xml, application/xml' },
			signal: AbortSignal.timeout(requestTimeout)
		});

	try {
		let response = await request();
		if (response.status === 429) {
			await sleep(retryDelay(response));
			response = await request();
		}
		if (!response.ok) return undefined;
		const body = await response.text();
		return body.length > maxFeedLength ? undefined : body;
	} catch {
		return undefined;
	}
}

/**
 * Returns the articles of the journal, newest first, from the cache when it is fresh.
 * After a 429 response the feed is requested once more after the indicated delay, never more.
 */
export async function getJournal(db: AppDatabase, config: JournalConfig): Promise<JournalResult> {
	const cached = readCache(db, cacheKey);
	if (cached !== undefined) return { ok: true, articles: cached as Article[] };

	const xml = await fetchFeed(config);
	if (xml === undefined) return { ok: false };
	const articles = parseFeed(xml);
	if (articles.length === 0) return { ok: false };
	writeCache(db, cacheKey, articles, cacheTtl);
	return { ok: true, articles };
}
