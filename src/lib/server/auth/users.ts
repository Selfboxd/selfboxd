import { count, eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/connection';
import { users } from '../db/schema';
import type { RatingScale } from '../../catalog/library';
import { hashPassword } from './password';

export type User = typeof users.$inferSelect;

/** The part of an account that is safe to expose to pages and API clients. */
export interface PublicUser {
	id: number;
	username: string;
	isAdmin: boolean;
	/** Changes each time the profile picture is replaced; `null` without a picture. */
	avatarVersion: number | null;
	ratingScale: RatingScale;
	/** ISO 3166-1 code of the country chosen by the account. */
	country: string | null;
}

export function toPublicUser(user: User): PublicUser {
	return {
		id: user.id,
		username: user.username,
		isAdmin: user.isAdmin,
		avatarVersion: user.avatarVersion,
		ratingScale: user.ratingScale,
		country: user.country
	};
}

export function countUsers(db: AppDatabase): number {
	return db.select({ value: count() }).from(users).get()?.value ?? 0;
}

export function listUsers(db: AppDatabase): PublicUser[] {
	return db.select().from(users).orderBy(users.id).all().map(toPublicUser);
}

export function findUserByUsername(db: AppDatabase, username: string): User | undefined {
	return db.select().from(users).where(eq(users.username, username)).get();
}

export function findUserById(db: AppDatabase, id: number): User | undefined {
	return db.select().from(users).where(eq(users.id, id)).get();
}

export interface NewUser {
	username: string;
	password: string;
	isAdmin: boolean;
}

/** Creates an account, or returns `undefined` when the username is already taken. */
export async function createUser(db: AppDatabase, input: NewUser): Promise<User | undefined> {
	const passwordHash = await hashPassword(input.password);
	return db
		.insert(users)
		.values({ username: input.username, passwordHash, isAdmin: input.isAdmin })
		.onConflictDoNothing({ target: users.username })
		.returning()
		.get();
}

/**
 * Creates the administrator account of a new instance.
 * Returns `undefined` when the instance already has an account.
 */
export async function createFirstUser(
	db: AppDatabase,
	input: Omit<NewUser, 'isAdmin'>
): Promise<User | undefined> {
	const passwordHash = await hashPassword(input.password);
	return db.transaction((transaction) => {
		const existing = transaction.select({ value: count() }).from(users).get()?.value ?? 0;
		if (existing > 0) return undefined;
		return transaction
			.insert(users)
			.values({ username: input.username, passwordHash, isAdmin: true })
			.returning()
			.get();
	});
}

/** Records that the profile picture changed, or was removed when `version` is `null`. */
export function setAvatarVersion(db: AppDatabase, userId: number, version: number | null) {
	db.update(users).set({ avatarVersion: version }).where(eq(users.id, userId)).run();
}

export function setRatingScale(db: AppDatabase, userId: number, ratingScale: RatingScale) {
	db.update(users).set({ ratingScale }).where(eq(users.id, userId)).run();
}

export async function setPassword(db: AppDatabase, userId: number, password: string) {
	const passwordHash = await hashPassword(password);
	db.update(users).set({ passwordHash }).where(eq(users.id, userId)).run();
}
