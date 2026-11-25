import type { APIRequestContext } from '@playwright/test';

const tmdbUrl = 'http://localhost:4174';

/** Returns how many requests the fake TMDB received for a path. */
export async function tmdbRequestCount(request: APIRequestContext, path: string): Promise<number> {
	const response = await request.get(`${tmdbUrl}/__requests?path=${encodeURIComponent(path)}`);
	const body = (await response.json()) as { count: number };
	return body.count;
}
