import type { WorkKind } from './catalog/library';

/** Route of the page of a work, to give to `resolve` with the TMDB identifier as `id`. */
export function workRoute(kind: WorkKind): '/(app)/film/[id]' | '/(app)/series/[id]' {
	return kind === 'series' ? '/(app)/series/[id]' : '/(app)/film/[id]';
}

/** Route of the state API of a work, to give to `resolve` with the TMDB identifier as `id`. */
export function stateRoute(
	kind: WorkKind
): '/api/v1/films/[id]/state' | '/api/v1/series/[id]/state' {
	return kind === 'series' ? '/api/v1/series/[id]/state' : '/api/v1/films/[id]/state';
}

/** Route of the API of the pictures of a work. */
export function imagesRoute(
	kind: WorkKind
): '/api/v1/films/[id]/images' | '/api/v1/series/[id]/images' {
	return kind === 'series' ? '/api/v1/series/[id]/images' : '/api/v1/films/[id]/images';
}

/** Route of the browse page of a kind of work. */
export function browseRoute(kind: WorkKind): '/(app)/films/browse' | '/(app)/series/browse' {
	return kind === 'series' ? '/(app)/series/browse' : '/(app)/films/browse';
}
