import { eq, lte } from 'drizzle-orm';
import type { AppDatabase } from '../db/connection';
import { loginThrottles } from '../db/schema';

/** Number of failed sign-ins tolerated before delays start. */
export const freeAttempts = 3;

/** Delay applied after the first failure beyond the free attempts, in milliseconds. */
const baseDelay = 2000;

/** Upper bound of the delay, in milliseconds. */
const maxDelay = 15 * 60 * 1000;

/** Time without any failure after which the failure count starts over, in milliseconds. */
const memory = 24 * 60 * 60 * 1000;

/** Delay imposed after a given number of consecutive failures, in milliseconds. */
export function delayAfter(failures: number): number {
	if (failures < freeAttempts) return 0;
	return Math.min(baseDelay * 2 ** Math.min(failures - freeAttempts, 30), maxDelay);
}

/** Returns how many seconds the username stays locked, or 0 when a sign-in may be attempted. */
export function secondsUntilUnlocked(db: AppDatabase, username: string, now = new Date()): number {
	const row = db.select().from(loginThrottles).where(eq(loginThrottles.username, username)).get();
	if (!row) return 0;
	return Math.max(0, Math.ceil((row.lockedUntil.getTime() - now.getTime()) / 1000));
}

/** Records a failed sign-in and lengthens the lock of the username accordingly. */
export function recordFailure(db: AppDatabase, username: string, now = new Date()): void {
	db.transaction((transaction) => {
		transaction
			.delete(loginThrottles)
			.where(lte(loginThrottles.lastFailureAt, new Date(now.getTime() - memory)))
			.run();
		const row = transaction
			.select()
			.from(loginThrottles)
			.where(eq(loginThrottles.username, username))
			.get();
		const failures = (row?.failures ?? 0) + 1;
		const values = {
			failures,
			lastFailureAt: now,
			lockedUntil: new Date(now.getTime() + delayAfter(failures))
		};
		transaction
			.insert(loginThrottles)
			.values({ username, ...values })
			.onConflictDoUpdate({ target: loginThrottles.username, set: values })
			.run();
	});
}

/** Forgets the failures of a username after a successful sign-in. */
export function clearFailures(db: AppDatabase, username: string): void {
	db.delete(loginThrottles).where(eq(loginThrottles.username, username)).run();
}
