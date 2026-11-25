import { getMdblistContext } from '#lib/server/mdblist/index.js';
import { searchLists } from '#lib/server/mdblist/service.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage } from '#lib/server/tmdb/page.js';
import {
	searchPageMax,
	searchQueryMaxLength,
	searchWorks,
	type SearchScope
} from '#lib/server/tmdb/service.js';
import type { PageServerLoad } from './$types';

function parsePage(value: string | null): number {
	const page = Number(value);
	return Number.isInteger(page) && page >= 1 && page <= searchPageMax ? page : 1;
}

/** What the results cover, from the `type` of the query string; everything by default. */
function parseScope(value: string | null): SearchScope {
	if (value === 'films') return 'film';
	if (value === 'series') return 'series';
	if (value === 'people') return 'person';
	return 'all';
}

export const load: PageServerLoad = async ({ url }) => {
	const query = (url.searchParams.get('q') ?? '').trim().slice(0, searchQueryMaxLength);
	const lists = getMdblistContext();
	const hasLists = lists !== undefined;

	if (lists && url.searchParams.get('type') === 'lists') {
		const result = await searchLists(lists, query);
		if (!result.ok) return { query, hasLists, state: 'lists_error' as const };
		return { query, hasLists, state: 'lists' as const, lists: result.value };
	}

	const context = getTmdbContext();
	if (!context) return { query, hasLists, state: 'not_configured' as const };

	const scope = parseScope(url.searchParams.get('type'));
	const page = parsePage(url.searchParams.get('page'));
	const result = await searchWorks(context, query, requestLanguage(), page, scope);
	if (!result.ok) return { query, hasLists, state: 'error' as const, error: result.error };
	return { query, hasLists, state: 'ready' as const, scope, ...result.value };
};
