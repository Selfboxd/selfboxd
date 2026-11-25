import type { AppDatabase } from '../db/connection';
import { normalizeUsername, passwordMaxLength, usernameMaxLength } from './credentials';
import { hashPassword, verifyPassword } from './password';
import { clearFailures, recordFailure, secondsUntilUnlocked } from './throttle';
import { findUserByUsername, type User } from './users';

export type LoginResult =
	| { status: 'success'; user: User }
	| { status: 'invalid_credentials' }
	| { status: 'too_many_attempts'; retryAfterSeconds: number };

let placeholderHash: Promise<string> | undefined;

/** Hash verified when the account does not exist, so that both cases take the same time. */
function getPlaceholderHash(): Promise<string> {
	placeholderHash ??= hashPassword('placeholder');
	return placeholderHash;
}

/**
 * Checks a username and password pair.
 * An unknown username and a wrong password are indistinguishable for the caller.
 */
export async function login(
	db: AppDatabase,
	rawUsername: string,
	password: string,
	now = new Date()
): Promise<LoginResult> {
	const username = normalizeUsername(rawUsername).slice(0, usernameMaxLength);

	const retryAfterSeconds = secondsUntilUnlocked(db, username, now);
	if (retryAfterSeconds > 0) return { status: 'too_many_attempts', retryAfterSeconds };

	const user = findUserByUsername(db, username);
	const hash = user?.passwordHash ?? (await getPlaceholderHash());
	const matches = password.length <= passwordMaxLength && (await verifyPassword(password, hash));

	if (!user || !matches) {
		recordFailure(db, username, now);
		return { status: 'invalid_credentials' };
	}

	clearFailures(db, username);
	return { status: 'success', user };
}
