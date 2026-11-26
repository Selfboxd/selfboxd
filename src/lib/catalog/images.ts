/** A picture of a work offered by TMDB. */
export interface WorkImage {
	/** TMDB path of the picture. */
	path: string;
	width: number;
	height: number;
}

/** Posters and backdrops of a work offered by TMDB, the best voted first. */
export interface WorkImages {
	posters: WorkImage[];
	backdrops: WorkImage[];
}

/** Poster and backdrop an account chose for a work; `null` keeps the one of TMDB. */
export interface ImageChoice {
	poster: string | null;
	backdrop: string | null;
}

/** Choices of an account, by kind and TMDB identifier of the work, such as `film:78`. */
export type ImageChoices = Record<string, ImageChoice>;

/** Key of a work among the image choices of an account. */
export function imageKey(kind: string, id: string | number): string {
	return `${kind}:${String(id)}`;
}
