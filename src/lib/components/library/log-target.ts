import type { DiaryEntry } from '#lib/catalog/library.js';

/** What the log dialog starts from when it logs a new viewing. */
export interface LogDefaults {
	title: string;
	year: number | null;
	rating: number | null;
	liked: boolean;
	rewatch: boolean;
}

/** What the log dialog works on: a new viewing or an existing entry. */
export type LogTarget =
	{ kind: 'new'; defaults: LogDefaults } | { kind: 'edit'; entry: DiaryEntry };
