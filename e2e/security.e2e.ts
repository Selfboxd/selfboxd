import { expect, test } from '@playwright/test';

const paths = ['/login', '/api/v1/health', '/api/v1/auth/session', '/missing-page'];

test.describe('security headers', () => {
	for (const path of paths) {
		test(`are set on ${path}`, async ({ request }) => {
			const headers = (await request.get(path)).headers();

			expect(headers['x-content-type-options']).toBe('nosniff');
			expect(headers['x-frame-options']).toBe('DENY');
			expect(headers['referrer-policy']).toBe('same-origin');
			expect(headers['cross-origin-opener-policy']).toBe('same-origin');
			expect(headers['cross-origin-resource-policy']).toBe('same-origin');
			expect(headers['permissions-policy']).toContain('camera=()');
		});
	}

	test('do not disclose the server technology', async ({ request }) => {
		const headers = (await request.get('/login')).headers();

		expect(headers['x-powered-by']).toBeUndefined();
		expect(headers['server']).toBeUndefined();
	});
});

test.describe('content security policy', () => {
	test('restricts every source to the instance itself', async ({ request }) => {
		const policy = (await request.get('/login')).headers()['content-security-policy'] ?? '';

		expect(policy).toContain("default-src 'self'");
		expect(policy).toContain("object-src 'none'");
		expect(policy).toContain("base-uri 'self'");
		expect(policy).toContain("form-action 'self'");
		expect(policy).toContain("frame-ancestors 'none'");
	});

	test('forbids inline and evaluated scripts', async ({ request }) => {
		const policy = (await request.get('/login')).headers()['content-security-policy'] ?? '';
		const scriptSources = /script-src ([^;]*)/.exec(policy)?.[1] ?? '';

		expect(scriptSources).toContain("'self'");
		expect(scriptSources).not.toContain("'unsafe-inline'");
		expect(scriptSources).not.toContain("'unsafe-eval'");
	});
});

test.describe('cross-site request forgery', () => {
	test('rejects form submissions from another origin', async ({ request }) => {
		const response = await request.post('/login', {
			headers: { origin: 'https://attacker.example' },
			form: { username: 'admin', password: 'x' }
		});

		expect(response.status()).toBe(403);
	});
});

test.describe('search engines', () => {
	test('are told not to index the instance', async ({ request }) => {
		const response = await request.get('/robots.txt');

		expect(await response.text()).toContain('Disallow: /');
	});
});
