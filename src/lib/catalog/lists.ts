import type { FilmSummary } from './film';

/** A public list of films published on MDBList. */
export interface PublicList {
	id: number;
	name: string;
	/** Name of the MDBList account that published the list. */
	owner: string | null;
	/** Number of works in the list, when MDBList reports it. */
	itemCount: number | null;
	likes: number | null;
}

/** A public list with the first films it holds. */
export interface PublicListPreview extends PublicList {
	preview: FilmSummary[];
}

/** One page of the films of a public list. */
export interface PublicListFilms {
	films: FilmSummary[];
	page: number;
	hasMore: boolean;
}

/** Number of posters shown for a list among other lists. */
export const publicListPreviewSize = 5;

/** Number of films shown on each page of a public list. */
export const publicListPageSize = 40;

/** Largest page offered for a public list. */
export const publicListPageMax = 250;
