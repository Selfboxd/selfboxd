import { createPrivateKey, createPublicKey, randomBytes, sign, type KeyObject } from 'node:crypto';

/** DER prefix of an Ed25519 private key in the PKCS #8 format, before its 32-byte seed. */
const pkcs8Prefix = Buffer.from('302e020100300506032b657004220420', 'hex');

/** Prefix of a recovery key, telling it apart from any other text. */
const recoveryPrefix = 'SBXD1-';

/** A new private key, as base64url of its 32-byte seed. */
export function newKeySeed(): string {
	return randomBytes(32).toString('base64url');
}

function privateKey(seed: string): KeyObject {
	return createPrivateKey({
		key: Buffer.concat([pkcs8Prefix, Buffer.from(seed, 'base64url')]),
		format: 'der',
		type: 'pkcs8'
	});
}

/** The public key of a seed, as base64url of its 32 bytes, as the platform knows it. */
export function publicKeyOf(seed: string): string {
	return createPublicKey(privateKey(seed))
		.export({ format: 'der', type: 'spki' })
		.subarray(-32)
		.toString('base64url');
}

/** Signs bytes with a seed; the signature is base64url. */
export function signWith(seed: string, message: Buffer): string {
	return sign(null, message, privateKey(seed)).toString('base64url');
}

/** The recovery key of a seed: what the user copies to move the profile to a new instance. */
export function recoveryKey(seed: string): string {
	return `${recoveryPrefix}${seed}`;
}

/** Reads a recovery key, returning its seed, or `undefined` when it is not one. */
export function parseRecoveryKey(text: string): string | undefined {
	const trimmed = text.trim();
	if (!trimmed.startsWith(recoveryPrefix)) return undefined;
	const seed = trimmed.slice(recoveryPrefix.length);
	if (!/^[A-Za-z0-9_-]{43}$/.test(seed) || Buffer.from(seed, 'base64url').length !== 32) {
		return undefined;
	}
	return seed;
}
