import type { DiaryEntry, WorkKind } from '#lib/catalog/library.js';

/** The film or series a new viewing is logged for. */
export interface LogFilm {
	/** Identifier of the film or series at TMDB. */
	id: string;
	kind: WorkKind;
	title: string;
	year: number | null;
	posterPath: string | null;
}

/** What the log dialog starts from when it logs a new viewing. */
export interface LogDefaults {
	rating: number | null;
	liked: boolean;
	rewatch: boolean;
	/** Season chosen first when a series is logged. */
	season?: number | null;
}

/** A season a series can be logged for. */
export interface LogSeason {
	number: number;
	name: string;
}

/** What the log dialog works on: a new viewing or an existing entry. */
export type LogTarget = (
	{ kind: 'new'; film: LogFilm; defaults: LogDefaults } | { kind: 'edit'; entry: DiaryEntry }
) & {
	/** Seasons offered when the work is a series. */
	seasons?: LogSeason[];
};
