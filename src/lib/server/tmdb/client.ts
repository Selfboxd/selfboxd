export interface TmdbConfig {
	/** Base URL of the API, without trailing slash. */
	baseUrl: string;
	/** Key of the instance: a v3 API key or an API Read Access Token. */
	apiKey: string;
	fetch?: typeof fetch;
	/** Waits for the given number of milliseconds. Replaced in tests. */
	sleep?: (milliseconds: number) => Promise<void>;
}

export type TmdbError = 'unauthorized' | 'not_found' | 'rate_limited' | 'unavailable';

export type TmdbResult = { ok: true; data: unknown } | { ok: false; error: TmdbError };

/** Longest time a single request may take, in milliseconds. */
const requestTimeout = 10_000;

/** Longest wait honoured after a 429 response, in milliseconds. */
const maxRetryDelay = 10_000;

const v3KeyPattern = /^[0-9a-f]{32}$/i;

function defaultSleep(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** Delay requested by a 429 response, in milliseconds, bounded by `maxRetryDelay`. */
function retryDelay(response: Response): number {
	const seconds = Number(response.headers.get('retry-after'));
	const delay = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000;
	return Math.min(delay, maxRetryDelay);
}

function buildRequest(config: TmdbConfig, path: string, params: Record<string, string>) {
	const url = new URL(config.baseUrl + path);
	for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);

	const headers: Record<string, string> = { accept: 'application/json' };
	if (v3KeyPattern.test(config.apiKey)) url.searchParams.set('api_key', config.apiKey);
	else headers.authorization = `Bearer ${config.apiKey}`;

	return { url, headers };
}

/**
 * Sends a GET request to TMDB.
 * After a 429 response it waits for the indicated delay and retries once, never more.
 */
export async function tmdbGet(
	config: TmdbConfig,
	path: string,
	params: Record<string, string> = {}
): Promise<TmdbResult> {
	const send = config.fetch ?? fetch;
	const sleep = config.sleep ?? defaultSleep;
	const { url, headers } = buildRequest(config, path, params);

	try {
		let response = await send(url, { headers, signal: AbortSignal.timeout(requestTimeout) });
		if (response.status === 429) {
			await sleep(retryDelay(response));
			response = await send(url, { headers, signal: AbortSignal.timeout(requestTimeout) });
		}

		if (response.status === 401) return { ok: false, error: 'unauthorized' };
		if (response.status === 404) return { ok: false, error: 'not_found' };
		if (response.status === 429) return { ok: false, error: 'rate_limited' };
		if (!response.ok) return { ok: false, error: 'unavailable' };
		return { ok: true, data: await response.json() };
	} catch {
		return { ok: false, error: 'unavailable' };
	}
}
