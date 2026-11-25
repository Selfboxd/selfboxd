import { describe, expect, it } from 'vitest';
import { normalizeUsername, validatePassword, validateUsername } from './credentials';

describe('normalizeUsername', () => {
	it('trims and lower-cases', () => {
		expect(normalizeUsername('  Ada_Lovelace ')).toBe('ada_lovelace');
	});
});

describe('validateUsername', () => {
	it.each(['ada', 'ada_lovelace', 'a1', 'x'.repeat(30)])('accepts %s', (username) => {
		expect(validateUsername(username)).toBeUndefined();
	});

	it.each(['', 'a', 'x'.repeat(31), 'Ada', 'ada lovelace', 'ada-lovelace', 'ada/..', 'adä'])(
		'rejects %s',
		(username) => {
			expect(validateUsername(username)).toBe('username_invalid');
		}
	);
});

describe('validatePassword', () => {
	it('accepts a password of the minimum length', () => {
		expect(validatePassword('12345678')).toBeUndefined();
	});

	it('rejects a short password', () => {
		expect(validatePassword('1234567')).toBe('password_too_short');
	});

	it('rejects an oversized password', () => {
		expect(validatePassword('x'.repeat(257))).toBe('password_too_long');
	});
});
