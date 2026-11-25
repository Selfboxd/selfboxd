import { JOURNAL_FEED_URL } from '$app/env/private';
import { getDatabase } from '#lib/server/db/index.js';
import { getJournal } from '#lib/server/journal/service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const journal = await getJournal(getDatabase(), { feedUrl: JOURNAL_FEED_URL });
	if (!journal.ok) return { state: 'error' as const };

	const sections = [
		...new Set(journal.articles.flatMap((article) => (article.category ? [article.category] : [])))
	].sort((a, b) => a.localeCompare(b));
	const requested = url.searchParams.get('section');
	return {
		state: 'ready' as const,
		articles: journal.articles,
		sections,
		archive: requested !== null,
		section: sections.find((name) => name === requested) ?? null
	};
};
