import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../testing/database';
import {
	clearFailures,
	delayAfter,
	freeAttempts,
	recordFailure,
	secondsUntilUnlocked
} from './throttle';

const start = new Date('2026-01-01T00:00:00Z');

function after(seconds: number): Date {
	return new Date(start.getTime() + seconds * 1000);
}

describe('delayAfter', () => {
	it('imposes no delay during the free attempts', () => {
		expect(delayAfter(freeAttempts - 1)).toBe(0);
	});

	it('doubles with each further failure', () => {
		expect([3, 4, 5, 6].map(delayAfter)).toEqual([2000, 4000, 8000, 16000]);
	});

	it('is capped at 15 minutes', () => {
		expect(delayAfter(1000)).toBe(15 * 60 * 1000);
	});
});

describe('login throttle', () => {
	let database: TestDatabase;

	beforeEach(() => {
		database = createTestDatabase();
	});

	afterEach(() => {
		database.cleanup();
	});

	function fail(times: number, username = 'ada', now = start) {
		for (let attempt = 0; attempt < times; attempt += 1) {
			recordFailure(database.db, username, now);
		}
	}

	it('does not lock an unknown username', () => {
		expect(secondsUntilUnlocked(database.db, 'ada', start)).toBe(0);
	});

	it('does not lock during the free attempts', () => {
		fail(freeAttempts - 1);

		expect(secondsUntilUnlocked(database.db, 'ada', start)).toBe(0);
	});

	it('locks once the free attempts are used', () => {
		fail(freeAttempts);

		expect(secondsUntilUnlocked(database.db, 'ada', start)).toBe(2);
	});

	it('lengthens the lock with each failure', () => {
		fail(freeAttempts + 3);

		expect(secondsUntilUnlocked(database.db, 'ada', start)).toBe(16);
	});

	it('unlocks once the delay has passed', () => {
		fail(freeAttempts);

		expect(secondsUntilUnlocked(database.db, 'ada', after(2))).toBe(0);
	});

	it('tracks each username separately', () => {
		fail(freeAttempts);

		expect(secondsUntilUnlocked(database.db, 'grace', start)).toBe(0);
	});

	it('forgets the failures after a success', () => {
		fail(freeAttempts + 2);

		clearFailures(database.db, 'ada');
		fail(1);

		expect(secondsUntilUnlocked(database.db, 'ada', start)).toBe(0);
	});

	it('starts over after a day without failure', () => {
		fail(freeAttempts + 2);

		fail(1, 'ada', after(24 * 60 * 60));

		expect(secondsUntilUnlocked(database.db, 'ada', after(24 * 60 * 60))).toBe(0);
	});
});
