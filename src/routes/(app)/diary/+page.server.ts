import {
	applyDiaryOptions,
	diaryDecades,
	diaryYears,
	parseDiaryOptions,
	type DiaryOptions,
	type DiaryRow
} from '#lib/catalog/diary-view.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listDiaryEntries } from '#lib/server/library/diary.js';
import { genreChoices } from '#lib/server/library/list-page.js';
import { loadWorkDetails } from '#lib/server/library/resolve.js';
import { chosenServices, streamingOn } from '#lib/server/library/services.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import type { PageServerLoad } from './$types';

/** Adds the genres and the services of each work, from the TMDB cache, when filters need them. */
async function refine(entries: DiaryRow[], options: DiaryOptions): Promise<DiaryRow[]> {
	const context = getTmdbContext();
	if ((options.genre === null && options.service === null) || !context) return entries;
	return Promise.all(
		entries.map(async (entry) => {
			const { kind, externalId } = entry.work;
			const [details, services] = await Promise.all([
				options.genre === null ? undefined : loadWorkDetails(context, kind, externalId),
				options.service === null ? undefined : streamingOn(kind, externalId)
			]);
			return {
				...entry,
				...(details ? { genres: details.ok ? details.value.genres : [] } : {}),
				...(services ? { services } : {})
			};
		})
	);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = requireUser(locals);
	const all = listDiaryEntries(getDatabase(), user.id);
	const parsed = parseDiaryOptions(url.searchParams);
	const tag = parsed.tag;
	const services = await chosenServices(user.id);
	const options: DiaryOptions = {
		...parsed,
		tag: tag !== null && all.some((entry) => entry.tags.includes(tag)) ? tag : null,
		service: services.some((service) => service.id === parsed.service) ? parsed.service : null
	};
	const [rows, genres] = await Promise.all([refine(all, options), genreChoices()]);
	return {
		options,
		entries: applyDiaryOptions(rows, options),
		total: all.length,
		years: diaryYears(all),
		decades: diaryDecades(all),
		genres,
		services
	};
};
