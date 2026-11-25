import type { CastMember, CrewGroup, FilmSummary, Person, WatchProviders } from './film';

/** A series as listed among others; its name is given as `title`, like a film. */
export type SeriesSummary = FilmSummary;

export interface Season {
	/** Number of the season; 0 holds the specials. */
	number: number;
	name: string;
	year: number | null;
	posterPath: string | null;
	episodeCount: number;
}

export interface Series extends SeriesSummary {
	originalTitle: string;
	tagline: string;
	overview: string;
	backdropPath: string | null;
	rating: { average: number; count: number };
	creators: Person[];
	cast: CastMember[];
	crew: CrewGroup[];
	genres: string[];
	/** Channels or platforms that first aired the series. */
	networks: string[];
	studios: string[];
	/** ISO 3166-1 codes of the countries of origin. */
	countries: string[];
	/** ISO 639-1 code of the original language. */
	originalLanguage: string;
	/** ISO 639-1 codes of the spoken languages. */
	spokenLanguages: string[];
	/** Identifier of the YouTube video of the trailer. */
	trailerKey: string | null;
	/** Offers in the country of the user, when TMDB knows any. */
	watch: WatchProviders | null;
	seasonCount: number;
	episodeCount: number;
	/** Whether the series has ended or was cancelled. */
	ended: boolean;
	/** Year of the last episode aired, when the series has ended. */
	endYear: number | null;
	/** Typical length of an episode in minutes. */
	episodeRuntime: number | null;
	/** Seasons in order, specials last. */
	seasons: Season[];
}
