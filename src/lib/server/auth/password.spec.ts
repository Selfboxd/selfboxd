import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
	it('verifies the password that was hashed', async () => {
		const hash = await hashPassword('correct horse battery staple');

		expect(await verifyPassword('correct horse battery staple', hash)).toBe(true);
	});

	it('rejects another password', async () => {
		const hash = await hashPassword('correct horse battery staple');

		expect(await verifyPassword('correct horse battery stapler', hash)).toBe(false);
	});

	it('never stores the password itself', async () => {
		const hash = await hashPassword('correct horse battery staple');

		expect(hash).not.toContain('correct horse battery staple');
	});

	it('produces a different hash each time', async () => {
		const first = await hashPassword('correct horse battery staple');
		const second = await hashPassword('correct horse battery staple');

		expect(first).not.toBe(second);
	});

	it('rejects a malformed hash', async () => {
		expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
	});
});
