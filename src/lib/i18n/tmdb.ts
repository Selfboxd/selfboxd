/** TMDB language tag used for each interface language. */
const tmdbLanguages: Record<string, string> = {
	en: 'en-US',
	es: 'es-ES',
	fr: 'fr-FR',
	pt: 'pt-PT',
	ja: 'ja-JP',
	de: 'de-DE',
	it: 'it-IT',
	zh: 'zh-CN'
};

/** Country used for releases and streaming offers until an account chooses its own. */
export const defaultRegion = 'US';

export function tmdbLanguage(locale: string): string {
	return tmdbLanguages[locale] ?? 'en-US';
}
