export const usernameMinLength = 2;
export const usernameMaxLength = 30;
export const passwordMinLength = 8;
export const passwordMaxLength = 256;

const usernamePattern = /^[a-z0-9_]+$/;

export type CredentialError = 'username_invalid' | 'password_too_short' | 'password_too_long';

/** Returns the canonical form of a username: trimmed and lower-cased. */
export function normalizeUsername(username: string): string {
	return username.trim().toLowerCase();
}

/** Returns the problem with a normalized username, or `undefined` when it is acceptable. */
export function validateUsername(username: string): CredentialError | undefined {
	const validLength = username.length >= usernameMinLength && username.length <= usernameMaxLength;
	return validLength && usernamePattern.test(username) ? undefined : 'username_invalid';
}

/** Returns the problem with a new password, or `undefined` when it is acceptable. */
export function validatePassword(password: string): CredentialError | undefined {
	if (password.length < passwordMinLength) return 'password_too_short';
	if (password.length > passwordMaxLength) return 'password_too_long';
	return undefined;
}
