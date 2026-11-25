export interface MdblistConfig {
	/** Base URL of the API, without trailing slash. */
	baseUrl: string;
	/** MDBList API key of the instance. */
	apiKey: string;
	fetch?: typeof fetch;
	/** Waits for the given number of milliseconds. Replaced in tests. */
	sleep?: (milliseconds: number) => Promise<void>;
}

export type MdblistError = 'unauthorized' | 'not_found' | 'rate_limited' | 'unavailable';

export type MdblistResult =
	{ ok: true; data: unknown; hasMore: boolean } | { ok: false; error: MdblistError };

/** Longest time a single request may take, in milliseconds. */
const requestTimeout = 10_000;

/** Longest wait honoured after a 429 response, in milliseconds. */
const maxRetryDelay = 10_000;

function defaultSleep(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function retryDelay(response: Response): number {
	const seconds = Number(response.headers.get('retry-after'));
	const delay = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000;
	return Math.min(delay, maxRetryDelay);
}

/**
 * Sends a GET request to MDBList.
 * After a 429 response it waits for the indicated delay and retries once, never more.
 */
export async function mdblistGet(
	config: MdblistConfig,
	path: string,
	params: Record<string, string> = {}
): Promise<MdblistResult> {
	const send = config.fetch ?? fetch;
	const sleep = config.sleep ?? defaultSleep;
	const url = new URL(config.baseUrl + path);
	for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
	url.searchParams.set('apikey', config.apiKey);
	const request = () =>
		send(url, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(requestTimeout)
		});

	try {
		let response = await request();
		if (response.status === 429) {
			await sleep(retryDelay(response));
			response = await request();
		}
		if (response.status === 401 || response.status === 403) {
			return { ok: false, error: 'unauthorized' };
		}
		if (response.status === 404) return { ok: false, error: 'not_found' };
		if (response.status === 429) return { ok: false, error: 'rate_limited' };
		if (!response.ok) return { ok: false, error: 'unavailable' };
		return {
			ok: true,
			data: await response.json(),
			hasMore: response.headers.get('x-has-more')?.toLowerCase() === 'true'
		};
	} catch {
		return { ok: false, error: 'unavailable' };
	}
}
