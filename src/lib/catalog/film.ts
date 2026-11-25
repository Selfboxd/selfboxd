export interface FilmSummary {
	id: number;
	title: string;
	year: number | null;
	posterPath: string | null;
}

export interface Person {
	id: number;
	name: string;
}

export interface CastMember extends Person {
	character: string;
}

export interface CrewGroup {
	job: string;
	people: Person[];
}

export const releaseTypes = [
	'premiere',
	'theatrical_limited',
	'theatrical',
	'digital',
	'physical',
	'tv'
] as const;

export type ReleaseType = (typeof releaseTypes)[number];

export interface Release {
	/** ISO 3166-1 code of the country. */
	country: string;
	/** Day of the release, as an ISO date. */
	date: string;
	type: ReleaseType;
	certification: string;
}

export interface Provider {
	id: number;
	name: string;
	logoPath: string | null;
}

export interface WatchProviders {
	/** Page listing every offer for the film in the country. */
	link: string;
	stream: Provider[];
	rent: Provider[];
	buy: Provider[];
}

export interface Film extends FilmSummary {
	originalTitle: string;
	tagline: string;
	overview: string;
	/** Running time in minutes. */
	runtime: number | null;
	backdropPath: string | null;
	rating: { average: number; count: number };
	directors: Person[];
	cast: CastMember[];
	crew: CrewGroup[];
	genres: string[];
	studios: string[];
	/** ISO 3166-1 codes of the production countries. */
	countries: string[];
	/** ISO 639-1 code of the original language. */
	originalLanguage: string;
	/** ISO 639-1 codes of the spoken languages. */
	spokenLanguages: string[];
	/** Identifier of the YouTube video of the trailer. */
	trailerKey: string | null;
	releases: Release[];
	/** Offers in the country of the user, when TMDB knows any. */
	watch: WatchProviders | null;
	collection: { id: number; name: string } | null;
}

export interface FilmCollection {
	id: number;
	name: string;
	films: FilmSummary[];
}
