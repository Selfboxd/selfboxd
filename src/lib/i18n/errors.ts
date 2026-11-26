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
		case 'mdblist_key_invalid':
			return m.error_mdblist_key_invalid();
		case 'tmdb_key_invalid':
			return m.error_tmdb_key_invalid();
		case 'unauthorized':
			return m.error_tmdb_unauthorized();
		case 'rate_limited':
			return m.error_tmdb_rate_limited();
		case 'unavailable':
		case 'invalid_response':
			return m.error_tmdb_unavailable();
		case 'has_diary_entries':
			return m.error_has_diary_entries();
		case 'date_invalid':
			return m.error_date_invalid();
		case 'season_invalid':
			return m.error_season_invalid();
		case 'status_invalid':
			return m.error_status_invalid();
		case 'rating_invalid':
			return m.error_rating_invalid();
		case 'review_too_long':
			return m.error_review_too_long();
		case 'note_too_long':
			return m.error_note_too_long();
		case 'entry_not_found':
			return m.error_entry_not_found();
		case 'list_name_required':
			return m.error_list_name_required();
		case 'list_name_too_long':
			return m.error_list_name_too_long();
		case 'list_description_too_long':
			return m.error_list_description_too_long();
		case 'list_not_found':
			return m.error_list_not_found();
		case 'bio_too_long':
			return m.error_bio_too_long();
		case 'location_too_long':
			return m.error_location_too_long();
		case 'pin_limit_reached':
			return m.error_pin_limit_reached();
		default:
			return m.error_generic();
	}
}
