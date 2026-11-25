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

/** One page of search results. */
export interface WorkSearch {
	results: WorkSearchResult[];
	total: number;
	page: number;
	totalPages: number;
}
