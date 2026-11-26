import { createPublicKey, verify } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { newKeySeed, parseRecoveryKey, publicKeyOf, recoveryKey, signWith } from './keys';

const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex');

describe('profile keys', () => {
	it('signs what the platform verifies with the public key', () => {
		const seed = newKeySeed();
		const message = Buffer.from('{"action":"publish"}');
		const publicKey = createPublicKey({
			key: Buffer.concat([spkiPrefix, Buffer.from(publicKeyOf(seed), 'base64url')]),
			format: 'der',
			type: 'spki'
		});

		expect(
			verify(null, message, publicKey, Buffer.from(signWith(seed, message), 'base64url'))
		).toBe(true);
		expect(publicKeyOf(seed)).toMatch(/^[A-Za-z0-9_-]{43}$/);
	});

	it('gives a different key each time', () => {
		expect(newKeySeed()).not.toBe(newKeySeed());
	});

	it('reads back its recovery key, and nothing else', () => {
		const seed = newKeySeed();
		expect(parseRecoveryKey(`  ${recoveryKey(seed)}\n`)).toBe(seed);
		expect(parseRecoveryKey(seed)).toBeUndefined();
		expect(parseRecoveryKey('SBXD1-short')).toBeUndefined();
		expect(parseRecoveryKey(`SBXD1-${'!'.repeat(43)}`)).toBeUndefined();
	});
});
