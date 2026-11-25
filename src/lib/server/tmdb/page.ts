import { getLocale } from '#lib/paraglide/runtime.js';
import { defaultRegion, tmdbLanguage } from '../../i18n/tmdb';

/** TMDB language tag matching the interface language of the current request. */
export function requestLanguage(): string {
	return tmdbLanguage(getLocale());
}

/** Country used for releases and streaming offers in the current request. */
export function requestRegion(): string {
	return defaultRegion;
}
