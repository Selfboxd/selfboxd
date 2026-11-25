import type { AppDatabase } from '../db/connection';
import {
	normalizeUsername,
	validatePassword,
	validateUsername,
	type CredentialError
} from './credentials';
import { revokeUserSessions } from './sessions';
import { createUser, findUserById, setPassword, type User } from './users';

export type AccountError = CredentialError | 'username_taken' | 'account_not_found';

export type AccountResult = { ok: true; user: User } | { ok: false; error: AccountError };

/** Validates the credentials and creates a regular account. */
export async function registerAccount(
	db: AppDatabase,
	rawUsername: string,
	password: string
): Promise<AccountResult> {
	const username = normalizeUsername(rawUsername);
	const error = validateUsername(username) ?? validatePassword(password);
	if (error) return { ok: false, error };

	const user = await createUser(db, { username, password, isAdmin: false });
	return user ? { ok: true, user } : { ok: false, error: 'username_taken' };
}

/** Replaces the password of an account and signs it out everywhere, except from one session. */
export async function resetPassword(
	db: AppDatabase,
	userId: number,
	password: string,
	keepSessionId?: number
): Promise<AccountResult> {
	const user = findUserById(db, userId);
	if (!user) return { ok: false, error: 'account_not_found' };
	const error = validatePassword(password);
	if (error) return { ok: false, error };

	await setPassword(db, userId, password);
	revokeUserSessions(db, userId, keepSessionId);
	return { ok: true, user };
}
