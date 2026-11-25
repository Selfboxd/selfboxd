import { describe, expect, it, vi } from 'vitest';
import { tmdbGet, type TmdbConfig } from './client';

interface Call {
	url: URL;
	headers: Record<string, string>;
}

function setup(responses: Response[], apiKey = 'read-access-token') {
	const calls: Call[] = [];
	const sleep = vi.fn(() => Promise.resolve());
	const config: TmdbConfig = {
		baseUrl: 'https://tmdb.test/3',
		apiKey,
		sleep,
		fetch: (input, init) => {
			calls.push({ url: input as URL, headers: init?.headers as Record<string, string> });
			const response = responses.shift();
			return response ? Promise.resolve(response) : Promise.reject(new Error('no response'));
		}
	};
	return { config, calls, sleep };
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
	return Response.json(body, { status, headers });
}

describe('tmdbGet', () => {
	it('returns the parsed body', async () => {
		const { config, calls } = setup([json({ id: 78 })]);

		const result = await tmdbGet(config, '/movie/78', { language: 'fr-FR' });

		expect(result).toEqual({ ok: true, data: { id: 78 } });
		expect(calls[0]?.url.href).toBe('https://tmdb.test/3/movie/78?language=fr-FR');
	});

	it('sends a read access token as a bearer token, never in the URL', async () => {
		const { config, calls } = setup([json({})]);

		await tmdbGet(config, '/movie/78');

		expect(calls[0]?.headers.authorization).toBe('Bearer read-access-token');
		expect(calls[0]?.url.href).not.toContain('read-access-token');
	});

	it('sends a v3 key as the api_key parameter', async () => {
		const key = '0123456789abcdef0123456789abcdef';
		const { config, calls } = setup([json({})], key);

		await tmdbGet(config, '/movie/78');

		expect(calls[0]?.url.searchParams.get('api_key')).toBe(key);
		expect(calls[0]?.headers.authorization).toBeUndefined();
	});

	it('waits for the indicated delay after a 429, then retries once', async () => {
		const { config, calls, sleep } = setup([
			json({}, 429, { 'retry-after': '3' }),
			json({ id: 78 })
		]);

		const result = await tmdbGet(config, '/movie/78');

		expect(result).toEqual({ ok: true, data: { id: 78 } });
		expect(sleep).toHaveBeenCalledExactlyOnceWith(3000);
		expect(calls).toHaveLength(2);
	});

	it('gives up after a second 429 instead of looping', async () => {
		const { config, calls } = setup([json({}, 429), json({}, 429), json({ id: 78 })]);

		const result = await tmdbGet(config, '/movie/78');

		expect(result).toEqual({ ok: false, error: 'rate_limited' });
		expect(calls).toHaveLength(2);
	});

	it('never waits longer than ten seconds', async () => {
		const { config, sleep } = setup([json({}, 429, { 'retry-after': '3600' }), json({})]);

		await tmdbGet(config, '/movie/78');

		expect(sleep).toHaveBeenCalledExactlyOnceWith(10_000);
	});

	it.each([
		[401, 'unauthorized'],
		[404, 'not_found'],
		[500, 'unavailable']
	])('maps status %i to %s', async (status, error) => {
		const { config } = setup([json({}, status)]);

		expect(await tmdbGet(config, '/movie/78')).toEqual({ ok: false, error });
	});

	it('reports a network failure as unavailable', async () => {
		const { config } = setup([]);

		expect(await tmdbGet(config, '/movie/78')).toEqual({ ok: false, error: 'unavailable' });
	});
});
