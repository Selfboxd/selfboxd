import type { Chart } from '../catalog/charts';
import { m } from '../paraglide/messages.js';

/** Name of a TMDB chart in the language of the interface. */
export function chartName(chart: Chart): string {
	switch (chart) {
		case 'popular':
			return m.chart_popular();
		case 'top-rated':
			return m.chart_top_rated();
		case 'now-playing':
			return m.chart_now_playing();
		case 'upcoming':
			return m.chart_upcoming();
	}
}
