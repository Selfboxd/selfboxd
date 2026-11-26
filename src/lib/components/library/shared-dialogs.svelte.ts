import type { WorkKind } from '#lib/catalog/library.js';
import type { LogTarget } from './log-target.js';

/** The work and lists the shared lists dialog works on. */
export interface ListsTarget {
	filmId: string;
	kind: WorkKind;
	lists: { id: number; name: string }[];
	member: number[];
}

/** The work whose poster or backdrop the shared picture dialog chooses. */
export interface ImagesTarget {
	filmId: string;
	kind: WorkKind;
	mode: 'poster' | 'backdrop';
}

/**
 * Dialogs mounted once by the application layout and opened from any poster.
 * Setting a target opens the matching dialog.
 */
export const sharedDialogs = $state<{
	log: LogTarget | null;
	lists: ListsTarget | null;
	images: ImagesTarget | null;
}>({
	log: null,
	lists: null,
	images: null
});
