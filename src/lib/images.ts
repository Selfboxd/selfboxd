import { TMDB_IMAGE_URL } from '$app/env/public';

/** Widths offered by the TMDB image host for each kind of picture. */
export type TmdbImageSize = 'w92' | 'w154' | 'w342' | 'w500' | 'w1280';

/** Builds the URL of a TMDB picture at the given width. */
export function tmdbImage(path: string, size: TmdbImageSize): string {
	return `${TMDB_IMAGE_URL}/${size}${path}`;
}
