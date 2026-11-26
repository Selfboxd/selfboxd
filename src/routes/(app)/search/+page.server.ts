import { JOURNAL_FEED_URL } from '$app/env/private';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { getJournal } from '#lib/server/journal/service.js';
import {
	searchArticles,
	searchOwnLists,
	searchReviews,
	searchTags
} from '#lib/server/library/search.js';
import { getMdblistContext } from '#lib/server/mdblist/index.js';
import { searchLists } from '#lib/server/mdblist/service.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage } from '#lib/server/tmdb/page.js';
import {
	getPopularFilms,
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

/** Words of a query tried on their own, longest first, when the whole query finds nothing. */
function broaderQueries(query: string): string[] {
	const words = [
		...new Set(query.split(/\s+/).filter((word) => word.length >= broadWordMinLength))
	];
	return words.length > 1 ? words.sort((a, b) => b.length - a.length).slice(0, broadTries) : [];
}

const broadWordMinLength = 3;
const broadTries = 2;
/** Popular films offered when a search finds nothing at all. */
const suggestionCount = 12;

/** Matches of the library shown above the films, series and people of an "All" search. */
const libraryPreview = { lists: 3, reviews: 3, tags: 8 };

export const load: PageServerLoad = async ({ url, locals }) => {
	const { user } = requireUser(locals);
	const query = (url.searchParams.get('q') ?? '').trim().slice(0, searchQueryMaxLength);
	const lists = getMdblistContext();
	const hasLists = lists !== undefined;
	const db = getDatabase();
	const type = url.searchParams.get('type');

	if (type === 'reviews') {
		return {
			query,
			hasLists,
			state: 'reviews' as const,
			reviews: searchReviews(db, user.id, query)
		};
	}
	if (type === 'your-lists') {
		return {
			query,
			hasLists,
			state: 'own_lists' as const,
			ownLists: searchOwnLists(db, user.id, query)
		};
	}
	if (type === 'tags') {
		return { query, hasLists, state: 'tags' as const, tags: searchTags(db, user.id, query) };
	}
	if (type === 'journal') {
		const journal = await getJournal(db, { feedUrl: JOURNAL_FEED_URL });
		return journal.ok
			? {
					query,
					hasLists,
					state: 'journal' as const,
					articles: searchArticles(journal.articles, query)
				}
			: { query, hasLists, state: 'journal_error' as const };
	}

	if (lists && url.searchParams.get('type') === 'lists') {
		const result = await searchLists(lists, query);
		if (!result.ok) return { query, hasLists, state: 'lists_error' as const };
		return { query, hasLists, state: 'lists' as const, lists: result.value };
	}

	const context = getTmdbContext();
	if (!context) return { query, hasLists, state: 'not_configured' as const };

	const scope = parseScope(type);
	const page = parsePage(url.searchParams.get('page'));
	const language = requestLanguage();
	let result = await searchWorks(context, query, language, page, scope);
	if (!result.ok) return { query, hasLists, state: 'error' as const, error: result.error };
	let broadened: string | null = null;
	if (page === 1 && result.value.results.length === 0) {
		for (const broader of broaderQueries(query)) {
			const found = await searchWorks(context, broader, language, 1, scope);
			if (found.ok && found.value.results.length > 0) {
				broadened = broader;
				result = { ok: true, value: { ...found.value, totalPages: 1 } };
				break;
			}
		}
	}
	const popular =
		page === 1 && query && result.value.results.length === 0 && scope !== 'person'
			? await getPopularFilms(context, language)
			: null;
	const suggestions = popular?.ok ? popular.value.slice(0, suggestionCount) : [];
	const library =
		scope === 'all' && page === 1 && query
			? {
					lists: searchOwnLists(db, user.id, query).slice(0, libraryPreview.lists),
					reviews: searchReviews(db, user.id, query).slice(0, libraryPreview.reviews),
					tags: searchTags(db, user.id, query).slice(0, libraryPreview.tags)
				}
			: null;
	return {
		query,
		hasLists,
		state: 'ready' as const,
		scope,
		library,
		broadened,
		suggestions,
		...result.value
	};
};
