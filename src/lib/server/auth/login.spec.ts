import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import { login } from './login';
import { freeAttempts } from './throttle';
import { createUser } from './users';

const start = new Date('2026-01-01T00:00:00Z');

describe('login', () => {
	let database: TestDatabase;

	beforeEach(async () => {
		database = createTestDatabase();
		await createUser(database.db, { username: 'ada', password: 'password-1', isAdmin: false });
	});

	afterEach(() => {
		database.cleanup();
	});

	it('accepts the right password', async () => {
		const result = await login(database.db, 'ada', 'password-1', start);

		expect(result).toMatchObject({ status: 'success', user: { username: 'ada' } });
	});

	it('ignores the case and surrounding spaces of the username', async () => {
		const result = await login(database.db, '  ADA ', 'password-1', start);

		expect(result.status).toBe('success');
	});

	it('gives the same answer for a wrong password and an unknown account', async () => {
		const wrongPassword = await login(database.db, 'ada', 'password-2', start);
		const unknownAccount = await login(database.db, 'grace', 'password-1', start);

		expect(wrongPassword).toEqual({ status: 'invalid_credentials' });
		expect(unknownAccount).toEqual(wrongPassword);
	});

	it('locks an existing and an unknown account alike after repeated failures', async () => {
		for (const username of ['ada', 'grace']) {
			for (let attempt = 0; attempt < freeAttempts; attempt += 1) {
				await login(database.db, username, 'wrong-password', start);
			}

			expect(await login(database.db, username, 'password-1', start)).toEqual({
				status: 'too_many_attempts',
				retryAfterSeconds: 2
			});
		}
	});

	it('accepts the right password again once the lock has passed', async () => {
		for (let attempt = 0; attempt < freeAttempts; attempt += 1) {
			await login(database.db, 'ada', 'wrong-password', start);
		}

		const result = await login(database.db, 'ada', 'password-1', new Date(start.getTime() + 2000));

		expect(result.status).toBe('success');
	});

	it('rejects an oversized password without locking differently', async () => {
		const result = await login(database.db, 'ada', 'x'.repeat(100_000), start);

		expect(result).toEqual({ status: 'invalid_credentials' });
	});
});
