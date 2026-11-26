import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import { verifyPassword } from './password';
import {
	countUsers,
	createFirstUser,
	createUser,
	findUserByUsername,
	listUsers,
	setPassword
} from './users';

describe('users', () => {
	let database: TestDatabase;

	beforeEach(() => {
		database = createTestDatabase();
	});

	afterEach(() => {
		database.cleanup();
	});

	it('makes the first account an administrator', async () => {
		const user = await createFirstUser(database.db, { username: 'ada', password: 'password-1' });

		expect(user).toMatchObject({ username: 'ada', isAdmin: true });
	});

	it('refuses a second first account', async () => {
		await createFirstUser(database.db, { username: 'ada', password: 'password-1' });

		const second = await createFirstUser(database.db, { username: 'eve', password: 'password-1' });

		expect(second).toBeUndefined();
		expect(countUsers(database.db)).toBe(1);
	});

	it('refuses a username that is already taken', async () => {
		await createUser(database.db, { username: 'ada', password: 'password-1', isAdmin: false });

		const duplicate = await createUser(database.db, {
			username: 'ada',
			password: 'password-2',
			isAdmin: false
		});

		expect(duplicate).toBeUndefined();
	});

	it('never exposes the password hash in the account list', async () => {
		await createUser(database.db, { username: 'ada', password: 'password-1', isAdmin: false });

		expect(listUsers(database.db)).toEqual([
			{
				id: 1,
				username: 'ada',
				isAdmin: false,
				avatarVersion: null,
				ratingScale: 'stars',
				country: null
			}
		]);
	});

	it('replaces the password', async () => {
		const user = await createUser(database.db, {
			username: 'ada',
			password: 'password-1',
			isAdmin: false
		});

		await setPassword(database.db, user?.id ?? 0, 'password-2');

		const hash = findUserByUsername(database.db, 'ada')?.passwordHash ?? '';
		expect(await verifyPassword('password-2', hash)).toBe(true);
		expect(await verifyPassword('password-1', hash)).toBe(false);
	});
});
