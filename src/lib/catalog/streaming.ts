/** A country TMDB knows streaming offers for. */
export interface Region {
	/** ISO 3166-1 code. */
	code: string;
	name: string;
}

/** A streaming service, as TMDB names it. */
export interface Service {
	/** Identifier of the TMDB watch provider. */
	id: number;
	name: string;
	logoPath: string | null;
}

/** Most services an account can choose. */
export const serviceMax = 50;

/** Whether a text is an ISO 3166-1 country code. */
export function isCountryCode(value: string): boolean {
	return /^[A-Z]{2}$/.test(value);
}
