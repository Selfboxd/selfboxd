import type { FilmSummary } from './film';

/** Film charts published by TMDB, shown as the official selection of lists. */
export const charts = ['popular', 'top-rated', 'now-playing', 'upcoming'] as const;

export type Chart = (typeof charts)[number];

export function isChart(value: string): value is Chart {
	return (charts as readonly string[]).includes(value);
}

/** Largest page offered for a chart. */
export const chartPageMax = 25;

/** Number of films TMDB serves on each page of a chart. */
export const chartPageSize = 20;

/** One page of a chart. */
export interface ChartPage {
	films: FilmSummary[];
	/** Path of the TMDB backdrop of the first film of the page that has one. */
	backdropPath: string | null;
	page: number;
	totalPages: number;
}
