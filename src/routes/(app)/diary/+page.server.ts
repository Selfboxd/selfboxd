import {
	applyDiaryOptions,
	diaryDecades,
	diaryYears,
	parseDiaryOptions,
	type DiaryRow
} from '#lib/catalog/diary-view.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listDiaryEntries } from '#lib/server/library/diary.js';
import { genreChoices } from '#lib/server/library/list-page.js';
import { loadWorkDetails } from '#lib/server/library/resolve.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import type { PageServerLoad } from './$types';

/** Adds the genres of each work, from the TMDB cache, when the diary is narrowed to a genre. */
async function withGenres(entries: DiaryRow[], genre: string | null): Promise<DiaryRow[]> {
	const context = getTmdbContext();
	if (genre === null || !context) return entries;
	return Promise.all(
		entries.map(async (entry) => {
			const details = await loadWorkDetails(context, entry.work.kind, entry.work.externalId);
			return { ...entry, genres: details.ok ? details.value.genres : [] };
		})
	);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = requireUser(locals);
	const all = listDiaryEntries(getDatabase(), user.id);
	const parsed = parseDiaryOptions(url.searchParams);
	const tag = parsed.tag;
	const options = {
		...parsed,
		tag: tag !== null && all.some((entry) => entry.tags.includes(tag)) ? tag : null
	};
	const [rows, genres] = await Promise.all([withGenres(all, options.genre), genreChoices()]);
	return {
		options,
		entries: applyDiaryOptions(rows, options),
		total: all.length,
		years: diaryYears(all),
		decades: diaryDecades(all),
		genres
	};
};
