import type { AppDatabase } from '../db/connection';
import { countUsers } from './users';

let hasUsers = false;

/** Tells whether the instance has at least one account. Accounts are never deleted. */
export function instanceHasUsers(db: AppDatabase): boolean {
	hasUsers ||= countUsers(db) > 0;
	return hasUsers;
}
