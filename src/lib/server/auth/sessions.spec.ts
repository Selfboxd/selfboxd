import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sessions } from '../db/schema';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import {
	createSession,
	deleteExpiredSessions,
	findSession,
	listSessions,
	revokeSession,
	revokeUserSessions
} from './sessions';
import { createUser, type User } from './users';

const day = 24 * 60 * 60 * 1000;
const start = new Date('2026-01-01T00:00:00Z');

function after(milliseconds: number): Date {
	return new Date(start.getTime() + milliseconds);
}

describe('sessions', () => {
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

	function open(user: User, kind: 'browser' | 'device' = 'browser') {
		return createSession(database.db, { userId: user.id, kind, label: 'Test' }, start);
	}

	it('resolves a token to its account', () => {
		const { token } = open(ada);

		expect(findSession(database.db, token, start)?.user.username).toBe('ada');
	});

	it('stores only a hash of the token', () => {
		const { token } = open(ada);

		const stored = database.db.select().from(sessions).all();
		expect(stored).toHaveLength(1);
		expect(JSON.stringify(stored)).not.toContain(token);
	});

	it('rejects an unknown token', () => {
		open(ada);

		expect(findSession(database.db, 'unknown', start)).toBeUndefined();
	});

	it('expires a browser session after 30 days without use', () => {
		const { token } = open(ada);

		expect(findSession(database.db, token, after(30 * day))).toBeUndefined();
		expect(listSessions(database.db, ada.id)).toEqual([]);
	});

	it('keeps a device session for 180 days without use', () => {
		const { token } = open(ada, 'device');

		expect(findSession(database.db, token, after(179 * day))).toBeDefined();
	});

	it('extends a session each time it is used', () => {
		const { token } = open(ada);

		findSession(database.db, token, after(29 * day));

		expect(findSession(database.db, token, after(58 * day))).toBeDefined();
	});

	it('truncates an oversized label', () => {
		const { session } = createSession(database.db, {
			userId: ada.id,
			kind: 'device',
			label: 'x'.repeat(500)
		});

		expect(session.label).toHaveLength(100);
	});

	it('revokes a single session', () => {
		const first = open(ada);
		const second = open(ada);

		expect(revokeSession(database.db, ada.id, first.session.id)).toBe(true);

		expect(findSession(database.db, first.token, start)).toBeUndefined();
		expect(findSession(database.db, second.token, start)).toBeDefined();
	});

	it('does not let an account revoke the session of another account', () => {
		const { token, session } = open(ada);

		expect(revokeSession(database.db, grace.id, session.id)).toBe(false);
		expect(findSession(database.db, token, start)).toBeDefined();
	});

	it('revokes every session of an account except the one to keep', () => {
		const kept = open(ada);
		const other = open(ada);
		const foreign = open(grace);

		revokeUserSessions(database.db, ada.id, kept.session.id);

		expect(findSession(database.db, kept.token, start)).toBeDefined();
		expect(findSession(database.db, other.token, start)).toBeUndefined();
		expect(findSession(database.db, foreign.token, start)).toBeDefined();
	});

	it('deletes expired sessions', () => {
		open(ada);
		open(ada, 'device');

		deleteExpiredSessions(database.db, after(31 * day));

		expect(listSessions(database.db, ada.id).map((session) => session.kind)).toEqual(['device']);
	});
});
