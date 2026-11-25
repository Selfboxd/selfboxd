import { expect, test } from '@playwright/test';
import { admin, apiSignIn, bearer, createAccount, uniqueUsername } from './support/accounts';

test.describe('POST /api/v1/auth/login', () => {
	test('returns a token and the account', async ({ request }) => {
		const account = await createAccount(request);

		const response = await request.post('/api/v1/auth/login', {
			data: { ...account, deviceName: 'Test device' }
		});

		expect(response.status()).toBe(200);
		expect(response.headers()['cache-control']).toBe('no-store');
		const body = (await response.json()) as { token: string; user: unknown };
		expect(body.token).toMatch(/^[\w-]{40,}$/);
		expect(body.user).toMatchObject({ username: account.username, isAdmin: false });
		expect(JSON.stringify(body)).not.toContain('password');
	});

	test('answers identically for a wrong password and an unknown account', async ({ request }) => {
		const account = await createAccount(request);

		const wrongPassword = await request.post('/api/v1/auth/login', {
			data: { ...account, password: 'wrong-password', deviceName: 'Test device' }
		});
		const unknownAccount = await request.post('/api/v1/auth/login', {
			data: { username: uniqueUsername('ghost'), password: 'x', deviceName: 'Test device' }
		});

		expect(wrongPassword.status()).toBe(401);
		expect(unknownAccount.status()).toBe(401);
		expect(await wrongPassword.json()).toEqual({ error: 'invalid_credentials' });
		expect(await unknownAccount.json()).toEqual({ error: 'invalid_credentials' });
	});

	for (const data of [
		{},
		{ username: 'admin' },
		{ username: 'admin', password: 'x' },
		{ username: 'admin', password: 'x', deviceName: ' ' },
		{ username: 1, password: {}, deviceName: [] },
		[]
	]) {
		test(`rejects the malformed body ${JSON.stringify(data)}`, async ({ request }) => {
			const response = await request.post('/api/v1/auth/login', { data });

			expect(response.status()).toBe(400);
			expect(await response.json()).toEqual({ error: 'invalid_request' });
		});
	}

	test('rejects a body that is not JSON', async ({ request }) => {
		const response = await request.post('/api/v1/auth/login', {
			headers: { 'content-type': 'application/json' },
			data: '{not json'
		});

		expect(response.status()).toBe(400);
	});

	test('slows down repeated failures and says how long to wait', async ({ request }) => {
		const data = {
			username: uniqueUsername('ghost'),
			password: 'wrong-password',
			deviceName: 'Test device'
		};
		for (let attempt = 0; attempt < 3; attempt += 1) {
			expect((await request.post('/api/v1/auth/login', { data })).status()).toBe(401);
		}

		const response = await request.post('/api/v1/auth/login', { data });

		expect(response.status()).toBe(429);
		expect(Number(response.headers()['retry-after'])).toBeGreaterThan(0);
		expect(await response.json()).toMatchObject({ error: 'too_many_attempts' });
	});

	test('does not let a locked account in, even with the right password', async ({ request }) => {
		const account = await createAccount(request);
		const wrong = { ...account, password: 'wrong-password', deviceName: 'Test device' };
		for (let attempt = 0; attempt < 3; attempt += 1) {
			await request.post('/api/v1/auth/login', { data: wrong });
		}

		const response = await request.post('/api/v1/auth/login', {
			data: { ...account, deviceName: 'Test device' }
		});

		expect(response.status()).toBe(429);
	});
});

test.describe('GET /api/v1/auth/session', () => {
	test('returns the account of the token', async ({ request }) => {
		const account = await createAccount(request);
		const token = await apiSignIn(request, account);

		const response = await request.get('/api/v1/auth/session', { headers: bearer(token) });

		expect(response.status()).toBe(200);
		expect(await response.json()).toMatchObject({ user: { username: account.username } });
	});

	test('refuses a request without token', async ({ request }) => {
		const response = await request.get('/api/v1/auth/session');

		expect(response.status()).toBe(401);
		expect(await response.json()).toEqual({ error: 'unauthenticated' });
	});

	test('refuses an unknown token', async ({ request }) => {
		const response = await request.get('/api/v1/auth/session', {
			headers: bearer('not-a-real-token')
		});

		expect(response.status()).toBe(401);
	});
});

test.describe('POST /api/v1/auth/logout', () => {
	test('revokes the token', async ({ request }) => {
		const token = await apiSignIn(request, await createAccount(request));

		const logout = await request.post('/api/v1/auth/logout', {
			headers: bearer(token),
			data: {}
		});

		expect(logout.status()).toBe(204);
		const session = await request.get('/api/v1/auth/session', { headers: bearer(token) });
		expect(session.status()).toBe(401);
	});
});

test.describe('/api/v1/accounts', () => {
	test('lists the accounts for the administrator, without any secret', async ({ request }) => {
		const token = await apiSignIn(request, admin);

		const response = await request.get('/api/v1/accounts', { headers: bearer(token) });

		expect(response.status()).toBe(200);
		const body = (await response.json()) as { accounts: Record<string, unknown>[] };
		expect(body.accounts[0]).toEqual({ id: 1, username: 'admin', isAdmin: true });
	});

	test('refuses a duplicate username', async ({ request }) => {
		const token = await apiSignIn(request, admin);
		const existing = await createAccount(request);

		const response = await request.post('/api/v1/accounts', {
			headers: bearer(token),
			data: existing
		});

		expect(response.status()).toBe(409);
		expect(await response.json()).toEqual({ error: 'username_taken' });
	});

	test('refuses invalid credentials for the new account', async ({ request }) => {
		const token = await apiSignIn(request, admin);

		const invalidUsername = await request.post('/api/v1/accounts', {
			headers: bearer(token),
			data: { username: '../admin', password: 'user-password-1' }
		});
		const shortPassword = await request.post('/api/v1/accounts', {
			headers: bearer(token),
			data: { username: uniqueUsername(), password: 'short' }
		});

		expect(invalidUsername.status()).toBe(400);
		expect(await invalidUsername.json()).toEqual({ error: 'username_invalid' });
		expect(shortPassword.status()).toBe(400);
		expect(await shortPassword.json()).toEqual({ error: 'password_too_short' });
	});

	test('is closed to regular accounts', async ({ request }) => {
		const token = await apiSignIn(request, await createAccount(request));

		const list = await request.get('/api/v1/accounts', { headers: bearer(token) });
		const create = await request.post('/api/v1/accounts', {
			headers: bearer(token),
			data: { username: uniqueUsername(), password: 'user-password-1' }
		});

		expect(list.status()).toBe(403);
		expect(create.status()).toBe(403);
	});

	test('is closed to anonymous requests', async ({ request }) => {
		const response = await request.get('/api/v1/accounts');

		expect(response.status()).toBe(401);
	});
});
