import { fail } from '@sveltejs/kit';
import {
	applyWatchlistOptions,
	parseWatchlistOptions,
	watchlistDecades,
	type WatchlistOptions,
	type WatchlistRow
} from '#lib/catalog/watchlist-view.js';
import { formText } from '#lib/server/auth/forms.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { isWatchlistPrivate, setWatchlistPrivate } from '#lib/server/auth/users.js';
import { getDatabase } from '#lib/server/db/index.js';
import { formFlag } from '#lib/server/library/forms.js';
import { genreChoices } from '#lib/server/library/list-page.js';
import { loadWorkDetails, resolveWork } from '#lib/server/library/resolve.js';
import { chosenServices, streamingOn } from '#lib/server/library/services.js';
import { listTagNames } from '#lib/server/library/tags.js';
import {
	addToWatchlist,
	clearWatchlist,
	deleteFromWatchlist,
	listWatchlist
} from '#lib/server/library/watchlist.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import type { Actions, PageServerLoad } from './$types';

/** Adds the genres and the services of each work, from the TMDB cache, when filters need them. */
async function refine(items: WatchlistRow[], options: WatchlistOptions): Promise<WatchlistRow[]> {
	const context = getTmdbContext();
	if ((options.genre === null && options.service === null) || !context) return items;
	return Promise.all(
		items.map(async (item) => {
			const { kind, externalId } = item.work;
			const [details, services] = await Promise.all([
				options.genre === null ? undefined : loadWorkDetails(context, kind, externalId),
				options.service === null ? undefined : streamingOn(kind, externalId)
			]);
			return {
				...item,
				...(details ? { genres: details.ok ? details.value.genres : [] } : {}),
				...(services ? { services } : {})
			};
		})
	);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = requireUser(locals);
	const db = getDatabase();
	const all = listWatchlist(db, user.id);
	const tags = listTagNames(db, user.id, 'watchlist');
	const parsed = parseWatchlistOptions(url.searchParams);
	const services = await chosenServices(user.id);
	const options: WatchlistOptions = {
		...parsed,
		tag: tags.find((name) => name === parsed.tag) ?? null,
		service: services.some((service) => service.id === parsed.service) ? parsed.service : null
	};
	const [rows, genres] = await Promise.all([refine(all, options), genreChoices()]);
	return {
		options,
		items: applyWatchlistOptions(rows, options),
		total: all.length,
		decades: watchlistDecades(all),
		genres,
		services,
		tags,
		isPrivate: isWatchlistPrivate(db, user.id)
	};
};

export const actions: Actions = {
	remove: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const workId = Number(formText(await request.formData(), 'workId'));
		if (Number.isInteger(workId)) deleteFromWatchlist(getDatabase(), user.id, workId);
		return { action: 'remove' as const };
	},

	add: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const form = await request.formData();
		const kind = formText(form, 'kind');
		if (kind !== 'film' && kind !== 'series') {
			return fail(400, { action: 'add' as const, error: 'invalid_request' as const });
		}
		const work = await resolveWork(kind, formText(form, 'workId'));
		const listed = listWatchlist(getDatabase(), user.id).find((item) => item.work.id === work.id);
		if (!listed) addToWatchlist(getDatabase(), user.id, work.id, { note: '', tags: [] });
		return { action: 'add' as const, title: work.title };
	},

	privacy: async ({ locals, request }) => {
		const { user } = requireUser(locals);
		const isPrivate = formFlag(await request.formData(), 'private');
		setWatchlistPrivate(getDatabase(), user.id, isPrivate);
		return { action: 'privacy' as const, isPrivate };
	},

	clear: ({ locals }) => {
		const { user } = requireUser(locals);
		clearWatchlist(getDatabase(), user.id);
		return { action: 'clear' as const };
	}
};
