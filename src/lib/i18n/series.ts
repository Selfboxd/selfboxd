import type { SeriesStatus } from '../catalog/library';
import { m } from '../paraglide/messages.js';

/** Name of a season in the language of the interface; season 0 holds the specials. */
export function seasonName(season: number): string {
	return season === 0 ? m.series_specials() : m.series_season({ number: String(season) });
}

/** Name of a series status in the language of the interface. */
export function seriesStatusName(status: SeriesStatus): string {
	switch (status) {
		case 'watching':
			return m.status_watching();
		case 'finished':
			return m.status_finished();
		case 'abandoned':
			return m.status_abandoned();
	}
}
