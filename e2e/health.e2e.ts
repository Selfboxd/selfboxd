import { expect, test } from '@playwright/test';

test.describe('GET /api/v1/health', () => {
	test('reports a healthy instance', async ({ request }) => {
		const response = await request.get('/api/v1/health');

		expect(response.status()).toBe(200);
		expect(await response.json()).toEqual({ status: 'ok' });
	});

	test('is never cached', async ({ request }) => {
		const response = await request.get('/api/v1/health');

		expect(response.headers()['cache-control']).toBe('no-store');
	});

	test('rejects unsupported methods', async ({ request, baseURL }) => {
		const response = await request.post('/api/v1/health', {
			headers: { origin: baseURL ?? '' }
		});

		expect(response.status()).toBe(405);
	});
});
