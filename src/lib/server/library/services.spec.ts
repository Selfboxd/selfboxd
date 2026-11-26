import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createUser, type User } from '../auth/users';
import { users } from '../db/schema';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import { listServices, setStreaming } from './services';

describe('streaming services of an account', () => {
	let database: TestDatabase;
	let ada: User;
	let grace: User;

	beforeEach(async () => {
		database = createTestDatabase();
		const created = await Promise.all(
			['ada', 'grace'].map((username) =>
				createUser(database.db, { username, password: 'password-1', isAdmin: false })
			)
		);
		[ada, grace] = created as [User, User];
	});

	afterEach(() => {
		database.cleanup();
	});

	it('saves the country and the services, each once', () => {
		setStreaming(database.db, ada.id, 'FR', [381, 8, 381]);

		expect(listServices(database.db, ada.id).sort((a, b) => a - b)).toEqual([8, 381]);
		expect(
			database.db.select({ country: users.country }).from(users).where(eq(users.id, ada.id)).get()
		).toEqual({ country: 'FR' });
		expect(listServices(database.db, grace.id)).toEqual([]);
	});

	it('replaces the services chosen before', () => {
		setStreaming(database.db, ada.id, 'US', [8, 11]);
		setStreaming(database.db, ada.id, 'US', [11]);

		expect(listServices(database.db, ada.id)).toEqual([11]);
	});
});
