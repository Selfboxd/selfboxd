import { getLocale } from '#lib/paraglide/runtime.js';

function displayName(type: 'region' | 'language', code: string): string {
	try {
		return new Intl.DisplayNames([getLocale()], { type }).of(code) ?? code;
	} catch {
		return code;
	}
}

/** Name of a country in the current language, from its ISO 3166-1 code. */
export function countryName(code: string): string {
	return displayName('region', code);
}

/** Name of a language in the current language, from its ISO 639-1 code. */
export function languageName(code: string): string {
	return displayName('language', code);
}
