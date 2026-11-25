import { charts } from '#lib/catalog/charts.js';
import { featuredListCount, publicListPreviewSize } from '#lib/catalog/lists.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { getMdblistContext } from '#lib/server/mdblist/index.js';
import { getTopLists } from '#lib/server/mdblist/service.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage } from '#lib/server/tmdb/page.js';
import { getChart } from '#lib/server/tmdb/service.js';
import type { PageServerLoad } from './$types';

async function loadOfficial() {
	const context = getTmdbContext();
	if (!context) return [];
	const language = requestLanguage();
	const pages = await Promise.all(
		charts.map(async (chart) => ({ chart, page: await getChart(context, chart, language) }))
	);
	return pages.flatMap(({ chart, page }) =>
		page.ok ? [{ chart, preview: page.value.films.slice(0, publicListPreviewSize) }] : []
	);
}

async function loadPublic() {
	const context = getMdblistContext();
	if (!context) return { state: 'not_configured' as const };
	const lists = await getTopLists(context);
	if (!lists.ok) return { state: 'error' as const, error: lists.error };
	return {
		state: 'ready' as const,
		featured: lists.value.slice(0, featuredListCount),
		popular: lists.value.slice(featuredListCount)
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	requireUser(locals);
	const [official, lists] = await Promise.all([loadOfficial(), loadPublic()]);
	return { official, lists };
};
