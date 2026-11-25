import type { DiaryEntry } from '#lib/catalog/library.js';

/** The film a new viewing is logged for. */
export interface LogFilm {
	/** Identifier of the film at TMDB. */
	id: string;
	title: string;
	year: number | null;
	posterPath: string | null;
}

/** What the log dialog starts from when it logs a new viewing. */
export interface LogDefaults {
	rating: number | null;
	liked: boolean;
	rewatch: boolean;
}

/** What the log dialog works on: a new viewing or an existing entry. */
export type LogTarget =
	{ kind: 'new'; film: LogFilm; defaults: LogDefaults } | { kind: 'edit'; entry: DiaryEntry };
