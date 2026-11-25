/** How an account enters and reads ratings: five stars by halves, or a mark out of ten. */
export type RatingScale = 'stars' | 'ten';

export const ratingScales: readonly RatingScale[] = ['stars', 'ten'];

/** Ratings are stored as whole numbers in this range, whatever the scale. */
export const ratingMin = 1;
export const ratingMax = 10;

export const workKinds = ['film', 'series'] as const;

export type WorkKind = (typeof workKinds)[number];

/** Where an account stands with a series, set when it logs a season. */
export const seriesStatuses = ['watching', 'finished', 'abandoned'] as const;

export type SeriesStatus = (typeof seriesStatuses)[number];

/** Highest season number accepted in a diary entry. */
export const seasonMax = 999;

/** A film or a series, as stored on the instance once an account has interacted with it. */
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
	/** Where the account stands with a series; always `null` for a film. */
	status: SeriesStatus | null;
}

export interface DiaryEntry {
	id: number;
	work: Work;
	/** Day of the viewing, as an ISO date. */
	watchedOn: string;
	/** Season of a series the entry is about, or `null` for a film or a whole series. */
	season: number | null;
	rating: number | null;
	liked: boolean;
	rewatch: boolean;
	review: string;
	containsSpoilers: boolean;
	/** Whether the review is shown on the profile of the account. */
	pinned: boolean;
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

/** A work an account has watched, with what the account thought of it. */
export interface WatchedWork {
	work: Work;
	rating: number | null;
	liked: boolean;
}

export type ActivityKind = 'logged' | 'watched' | 'liked' | 'watchlisted';

/** Something an account did with a work, as listed on the activity page. */
export interface ActivityEvent {
	kind: ActivityKind;
	work: Work;
	at: Date;
	rating: number | null;
	liked: boolean;
	rewatch: boolean;
	reviewed: boolean;
}

/** A list of an account, as shown among its other lists. */
export interface ListSummary {
	id: number;
	name: string;
	description: string;
	ranked: boolean;
	/** Number of works in the list. */
	count: number;
	/** First works of the list, in order. */
	preview: Work[];
}

export interface ListItem {
	work: Work;
	note: string;
}

/** A list of an account with every work it holds, in order. */
export interface WorkList {
	id: number;
	name: string;
	description: string;
	ranked: boolean;
	items: ListItem[];
}

export const listNameMaxLength = 100;
export const listDescriptionMaxLength = 2000;
export const listNoteMaxLength = 500;
/** Number of works shown for a list among the other lists. */
export const listPreviewSize = 5;

/** What an account tells about itself on its profile. */
export interface Profile {
	bio: string;
	location: string;
	/** Path of the TMDB backdrop used as banner, or `null` without banner. */
	bannerPath: string | null;
}

export interface ProfileStats {
	/** Number of works marked as watched. */
	watched: number;
	/** Number of diary entries dated in the current year. */
	thisYear: number;
	lists: number;
}

export interface TagCount {
	name: string;
	count: number;
}

export const bioMaxLength = 1000;
export const locationMaxLength = 100;
export const favouriteSlots = 4;
export const pinnedReviewLimit = 2;
