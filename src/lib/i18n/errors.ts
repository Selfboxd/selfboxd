import { m } from '#lib/paraglide/messages.js';

/** Translates an error code returned by a form action into a message for the user. */
export function errorMessage(code: string, seconds = 0): string {
	switch (code) {
		case 'invalid_credentials':
			return m.error_invalid_credentials();
		case 'too_many_attempts':
			return m.error_too_many_attempts({ seconds });
		case 'username_invalid':
			return m.error_username_invalid();
		case 'username_taken':
			return m.error_username_taken();
		case 'password_too_short':
			return m.error_password_too_short();
		case 'password_too_long':
			return m.error_password_too_long();
		case 'password_mismatch':
			return m.error_password_mismatch();
		case 'current_password_invalid':
			return m.error_current_password_invalid();
		case 'image_invalid':
			return m.error_image_invalid();
		case 'image_too_large':
			return m.error_image_too_large();
		case 'tmdb_key_invalid':
			return m.error_tmdb_key_invalid();
		case 'unauthorized':
			return m.error_tmdb_unauthorized();
		case 'rate_limited':
			return m.error_tmdb_rate_limited();
		case 'unavailable':
		case 'invalid_response':
			return m.error_tmdb_unavailable();
		default:
			return m.error_generic();
	}
}
