import { error } from '@sveltejs/kit';
import type { WorkKind } from '../../catalog/library';
import type { CompanyKind } from '../../catalog/studio';
import { getTmdbContext } from '../tmdb/index';
import { getStudio } from '../tmdb/service';
import { loadBrowse } from './browse-page';

/** Loads the page of a studio or a network: the company and one page of its works. */
export async function loadStudio(
	company: CompanyKind,
	userId: number,
	id: number,
	params: URLSearchParams
) {
	const context = getTmdbContext();
	if (!context) return { state: 'not_configured' as const };

	const studio = await getStudio(context, company, id);
	if (!studio.ok) {
		if (studio.error === 'not_found') error(404);
		return { state: 'error' as const, error: studio.error };
	}
	const kind: WorkKind =
		company === 'network' || params.get('kind') === 'series' ? 'series' : 'film';
	const browse = await loadBrowse(
		kind,
		userId,
		params,
		company === 'studio' ? { studio: id } : { network: id }
	);
	return { ...browse, studio: studio.value, kind };
}
