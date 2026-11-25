import type { TmdbFailure } from './service';

/** HTTP status returned by the API of the instance for each TMDB failure. */
export function tmdbErrorStatus(error: TmdbFailure): number {
	switch (error) {
		case 'not_found':
			return 404;
		case 'rate_limited':
			return 429;
		default:
			return 502;
	}
}
