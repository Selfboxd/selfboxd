import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const algorithm = 'scrypt';
const cost = 32768;
const blockSize = 8;
const parallelization = 1;
const keyLength = 32;
const saltLength = 16;

function derive(password: string, salt: Buffer, length: number, options: ScryptOptions) {
	return new Promise<Buffer>((resolve, reject) => {
		scrypt(password.normalize('NFKC'), salt, length, options, (error, key) => {
			if (error) reject(error);
			else resolve(key);
		});
	});
}

function scryptOptions(N: number, r: number, p: number): ScryptOptions {
	return { N, r, p, maxmem: 256 * N * r };
}

/** Hashes a password into a self-describing string that `verifyPassword` understands. */
export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(saltLength);
	const key = await derive(
		password,
		salt,
		keyLength,
		scryptOptions(cost, blockSize, parallelization)
	);
	return [
		algorithm,
		cost,
		blockSize,
		parallelization,
		salt.toString('base64'),
		key.toString('base64')
	].join('$');
}

/** Checks a password against a hash produced by `hashPassword`. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [name, N, r, p, salt, key] = stored.split('$');
	if (name !== algorithm || !N || !r || !p || !salt || !key) return false;
	const expected = Buffer.from(key, 'base64');
	const actual = await derive(
		password,
		Buffer.from(salt, 'base64'),
		expected.length,
		scryptOptions(Number(N), Number(r), Number(p))
	);
	return timingSafeEqual(actual, expected);
}
