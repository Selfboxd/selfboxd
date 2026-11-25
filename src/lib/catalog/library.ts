/** How an account enters and reads ratings: five stars by halves, or a mark out of ten. */
export type RatingScale = 'stars' | 'ten';

export const ratingScales: readonly RatingScale[] = ['stars', 'ten'];

/** Ratings are stored as whole numbers in this range, whatever the scale. */
export const ratingMin = 1;
export const ratingMax = 10;

export type WorkKind = 'film';

/** A film, as stored on the instance once an account has interacted with it. */
export interface Work {
	id: number;
	kind: WorkKind;
	/** Identifier of the work at its data source. */
	externalId: string;
	title: string;
	year: number | null;
	posterPath: string | null;
}

/** What an account did with a work, outside of the diary. */
export interface WorkState {
	watched: boolean;
	liked: boolean;
	rating: number | null;
	inWatchlist: boolean;
	/** Number of diary entries of the account for the work. */
	logCount: number;
}

export interface DiaryEntry {
	id: number;
	work: Work;
	/** Day of the viewing, as an ISO date. */
	watchedOn: string;
	rating: number | null;
	liked: boolean;
	rewatch: boolean;
	review: string;
	containsSpoilers: boolean;
	tags: string[];
}

export interface WatchlistItem {
	work: Work;
	note: string;
	tags: string[];
	addedAt: Date;
}

export const reviewMaxLength = 20_000;
export const watchlistNoteMaxLength = 500;
export const tagMaxLength = 50;
export const tagMaxCount = 20;
