import type { FilmSummary, Person } from './film';
import type { WorkKind } from './library';

/** A film or a series found by a search. */
export interface WorkSearchResult extends FilmSummary {
	kind: WorkKind;
	originalTitle: string;
	/** Directors of a film, creators of a series. */
	people: Person[];
	alternativeTitles: string[];
}

/** A person found by a search, with the works TMDB knows them best for. */
export interface PersonSearchResult {
	kind: 'person';
	id: number;
	name: string;
	profilePath: string | null;
	/** Department TMDB knows the person for, such as `Acting`. */
	department: string;
	knownFor: string[];
}

export type SearchResult = WorkSearchResult | PersonSearchResult;

/** One page of search results. */
export interface WorkSearch {
	results: SearchResult[];
	total: number;
	page: number;
	totalPages: number;
}
