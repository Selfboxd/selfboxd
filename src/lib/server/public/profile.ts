import { ensureAccountFacts } from '../library/stats';
import { getTmdbContext } from '../tmdb/index';
import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/connection';
import { getDatabase } from '../db/index';
import { publicProfiles } from '../db/schema';
import { readAvatar } from '../media/avatar';
import { avatarsDir } from '../paths';
import { newKeySeed, parseRecoveryKey, publicKeyOf, signWith } from './keys';
import { signedRequest } from './platform';
import { buildSnapshot } from './snapshot';

export type PublicProfileRow = typeof publicProfiles.$inferSelect;

/** Shape of the address of a public profile, as the platform accepts it. */
export const handlePattern = /^[a-z0-9_]{2,30}$/;

/** Most bytes of an avatar the platform accepts. */
const avatarMaxBytes = 300 * 1024;

export type PublicProfileError =
	| 'handle_invalid'
	| 'handle_taken'
	| 'key_in_use'
	| 'recovery_key_invalid'
	| 'not_found'
	| 'too_many_requests'
	| 'unreachable'
	| 'platform_error';

type Outcome = { ok: true } | { ok: false; error: PublicProfileError };

function failure(error: string): { ok: false; error: PublicProfileError } {
	const known: PublicProfileError[] = [
		'handle_invalid',
		'handle_taken',
		'key_in_use',
		'not_found',
		'too_many_requests',
		'unreachable'
	];
	return {
		ok: false,
		error: known.find((code) => code === error) ?? 'platform_error'
	};
}

export function getPublicProfile(db: AppDatabase, userId: number): PublicProfileRow | undefined {
	return db.select().from(publicProfiles).where(eq(publicProfiles.userId, userId)).get();
}

/** An address offered for the public profile of an account, from its username. */
export function suggestedHandle(username: string): string {
	const handle = username
		.toLowerCase()
		.replace(/[^a-z0-9_]+/g, '_')
		.slice(0, 30);
	return handle.length >= 2 ? handle : `${handle}__`.slice(0, 2);
}

/** Sends the whole profile of an account to the platform; returns whether it was accepted. */
export async function publishNow(userId: number): Promise<Outcome> {
	const db = getDatabase();
	const row = getPublicProfile(db, userId);
	if (!row) return { ok: false, error: 'not_found' };
	db.update(publicProfiles).set({ pending: false }).where(eq(publicProfiles.userId, userId)).run();

	const context = getTmdbContext();
	if (context) await ensureAccountFacts(db, context, userId).catch(() => undefined);
	const avatar = await readAvatar(avatarsDir, userId);
	const result = await signedRequest(
		row.keySeed,
		'PUT',
		`/api/v1/profiles/${row.handle}`,
		'publish',
		row.handle,
		{
			profile: buildSnapshot(db, userId),
			avatar:
				avatar && avatar.length <= avatarMaxBytes
					? { type: 'image/webp', data: avatar.toString('base64') }
					: null,
			accessCode: row.accessCode
		}
	);

	if (result.ok) {
		db.update(publicProfiles)
			.set({ syncedAt: new Date(), lastError: null })
			.where(eq(publicProfiles.userId, userId))
			.run();
		return { ok: true };
	}
	db.update(publicProfiles)
		.set({ pending: true, lastError: result.error })
		.where(eq(publicProfiles.userId, userId))
		.run();
	return failure(result.error);
}

/** Reserves an address on the platform with a new key pair and publishes the profile there. */
export async function enablePublicProfile(
	userId: number,
	handle: string,
	accessCode: string | null
): Promise<Outcome> {
	if (!handlePattern.test(handle)) return { ok: false, error: 'handle_invalid' };
	const seed = newKeySeed();
	const reserved = await signedRequest(seed, 'POST', '/api/v1/profiles', 'reserve', handle);
	if (!reserved.ok) return failure(reserved.error);
	getDatabase()
		.insert(publicProfiles)
		.values({ userId, handle, keySeed: seed, accessCode, pending: true })
		.run();
	await publishNow(userId);
	return { ok: true };
}

/** Takes over a profile from its recovery key, as after moving to a new instance. */
export async function restorePublicProfile(userId: number, recovery: string): Promise<Outcome> {
	const seed = parseRecoveryKey(recovery);
	if (!seed) return { ok: false, error: 'recovery_key_invalid' };
	const found = await signedRequest(seed, 'POST', '/api/v1/profiles/lookup', 'lookup', undefined);
	if (!found.ok) return failure(found.error);
	const body = found.body as { handle?: unknown } | null;
	const handle = typeof body?.handle === 'string' ? body.handle : '';
	if (!handlePattern.test(handle)) return { ok: false, error: 'platform_error' };
	getDatabase()
		.insert(publicProfiles)
		.values({ userId, handle, keySeed: seed, accessCode: null, pending: true })
		.run();
	await publishNow(userId);
	return { ok: true };
}

/** Changes or removes the access code of the profile, then publishes it. */
export async function setAccessCode(userId: number, accessCode: string | null): Promise<Outcome> {
	getDatabase()
		.update(publicProfiles)
		.set({ accessCode, pending: true })
		.where(eq(publicProfiles.userId, userId))
		.run();
	return publishNow(userId);
}

/** Replaces the key pair of the profile; the old recovery key stops working. */
export async function replaceKey(userId: number): Promise<Outcome> {
	const db = getDatabase();
	const row = getPublicProfile(db, userId);
	if (!row) return { ok: false, error: 'not_found' };
	const next = newKeySeed();
	const result = await signedRequest(
		row.keySeed,
		'PUT',
		`/api/v1/profiles/${row.handle}/key`,
		'rotate',
		row.handle,
		{ key: publicKeyOf(next) },
		(nonce) => ({ proof: signWith(next, Buffer.from(nonce)) })
	);
	if (!result.ok) return failure(result.error);
	db.update(publicProfiles).set({ keySeed: next }).where(eq(publicProfiles.userId, userId)).run();
	return { ok: true };
}

/** Deletes the profile from the platform, then forgets it on the instance. */
export async function disablePublicProfile(userId: number): Promise<Outcome> {
	const db = getDatabase();
	const row = getPublicProfile(db, userId);
	if (!row) return { ok: true };
	const result = await signedRequest(
		row.keySeed,
		'DELETE',
		`/api/v1/profiles/${row.handle}`,
		'delete',
		row.handle
	);
	if (!result.ok && result.status !== 404) return failure(result.error);
	db.delete(publicProfiles).where(eq(publicProfiles.userId, userId)).run();
	return { ok: true };
}
