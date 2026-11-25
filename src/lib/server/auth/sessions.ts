import { createHash, randomBytes } from 'node:crypto';
import { and, eq, lte, ne } from 'drizzle-orm';
import type { AppDatabase } from '../db/connection';
import { sessions, users } from '../db/schema';
import type { User } from './users';

export type Session = typeof sessions.$inferSelect;
export type SessionKind = Session['kind'];

const day = 24 * 60 * 60 * 1000;

/** How long a session stays valid after its last use, per kind. */
const lifetimes: Record<SessionKind, number> = {
	browser: 30 * day,
	device: 180 * day
};

/** Minimum time between two updates of the last-use date of a session. */
const refreshInterval = 60 * 60 * 1000;

export const sessionLabelMaxLength = 100;

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export interface NewSession {
	userId: number;
	kind: SessionKind;
	label: string;
}

export interface CreatedSession {
	/** The secret handed to the client. Only its hash is stored. */
	token: string;
	session: Session;
}

export function createSession(
	db: AppDatabase,
	input: NewSession,
	now = new Date()
): CreatedSession {
	const token = randomBytes(32).toString('base64url');
	const session = db
		.insert(sessions)
		.values({
			tokenHash: hashToken(token),
			userId: input.userId,
			kind: input.kind,
			label: input.label.slice(0, sessionLabelMaxLength),
			createdAt: now,
			lastUsedAt: now,
			expiresAt: new Date(now.getTime() + lifetimes[input.kind])
		})
		.returning()
		.get();
	return { token, session };
}

export interface AuthenticatedSession {
	session: Session;
	user: User;
}

/** Resolves a token to its session and account, extending the session when it is still valid. */
export function findSession(
	db: AppDatabase,
	token: string,
	now = new Date()
): AuthenticatedSession | undefined {
	const row = db
		.select({ session: sessions, user: users })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.tokenHash, hashToken(token)))
		.get();
	if (!row) return undefined;

	if (row.session.expiresAt.getTime() <= now.getTime()) {
		db.delete(sessions).where(eq(sessions.id, row.session.id)).run();
		return undefined;
	}

	if (now.getTime() - row.session.lastUsedAt.getTime() >= refreshInterval) {
		const expiresAt = new Date(now.getTime() + lifetimes[row.session.kind]);
		db.update(sessions)
			.set({ lastUsedAt: now, expiresAt })
			.where(eq(sessions.id, row.session.id))
			.run();
		return { user: row.user, session: { ...row.session, lastUsedAt: now, expiresAt } };
	}

	return row;
}

export function listSessions(db: AppDatabase, userId: number): Session[] {
	return db.select().from(sessions).where(eq(sessions.userId, userId)).orderBy(sessions.id).all();
}

/** Revokes one session of an account. Returns whether a session was removed. */
export function revokeSession(db: AppDatabase, userId: number, sessionId: number): boolean {
	const result = db
		.delete(sessions)
		.where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
		.run();
	return result.changes > 0;
}

/** Revokes every session of an account, optionally keeping one. */
export function revokeUserSessions(db: AppDatabase, userId: number, keepSessionId?: number) {
	const ofUser = eq(sessions.userId, userId);
	db.delete(sessions)
		.where(keepSessionId === undefined ? ofUser : and(ofUser, ne(sessions.id, keepSessionId)))
		.run();
}

export function deleteExpiredSessions(db: AppDatabase, now = new Date()) {
	db.delete(sessions).where(lte(sessions.expiresAt, now)).run();
}
