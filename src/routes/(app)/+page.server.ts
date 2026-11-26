import { JOURNAL_FEED_URL } from '$app/env/private';
import type { FilmSummary } from '#lib/catalog/film.js';
import type { Work } from '#lib/catalog/library.js';
import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { getJournal } from '#lib/server/journal/service.js';
import { listDiaryEntries } from '#lib/server/library/diary.js';
import { chosenServices, streamingOn } from '#lib/server/library/services.js';
import { listWatchlist } from '#lib/server/library/watchlist.js';
import { getMdblistContext } from '#lib/server/mdblist/index.js';
import { getTopLists } from '#lib/server/mdblist/service.js';
import { getTmdbContext } from '#lib/server/tmdb/index.js';
import { requestLanguage } from '#lib/server/tmdb/page.js';
import { getChart, getPopularFilms, getPopularSeries } from '#lib/server/tmdb/service.js';
import type { PageServerLoad } from './$types';

/** Number of posters in each row of the page. */
const rowSize = 6;
/** Articles of the journal shown at the bottom. */
const articleCount = 4;
/** Public lists offered, picked at random among the popular ones. */
const listCount = 3;
/** Watchlist items checked for the services of the account. */
const watchlistChecked = 40;

/** Some items picked at random, a new pick at each visit. */
function pick<T>(items: T[], count: number): T[] {
	const pool = [...items];
	for (let index = pool.length - 1; index > 0; index--) {
		const other = Math.floor(Math.random() * (index + 1));
		[pool[index], pool[other]] = [pool[other] as T, pool[index] as T];
	}
	return pool.slice(0, count);
}

function asSummary(work: Work): FilmSummary & { kind: Work['kind'] } {
	return {
		id: Number(work.externalId),
		kind: work.kind,
		title: work.title,
		year: work.year,
		posterPath: work.posterPath
	};
}

/** Watchlist titles that stream on the services of the account, or a few at random without any. */
async function loadWatchlist(userId: number) {
	const items = listWatchlist(getDatabase(), userId);
	const services = await chosenServices(userId);
	if (services.length === 0 || items.length === 0) {
		return { streaming: false, works: pick(items, rowSize).map((item) => asSummary(item.work)) };
	}
	const ids = new Set(services.map((service) => service.id));
	const checked = await Promise.all(
		items.slice(0, watchlistChecked).map(async (item) => ({
			item,
			streams: (await streamingOn(item.work.kind, item.work.externalId)).some((id) => ids.has(id))
		}))
	);
	const works = checked
		.filter((entry) => entry.streams)
		.slice(0, rowSize)
		.map((entry) => asSummary(entry.item.work));
	return works.length > 0
		? { streaming: true, works }
		: { streaming: false, works: pick(items, rowSize).map((item) => asSummary(item.work)) };
}

async function loadLists() {
	const context = getMdblistContext();
	if (!context) return [];
	const lists = await getTopLists(context);
	return lists.ok ? pick(lists.value, listCount) : [];
}

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = requireUser(locals);
	const context = getTmdbContext();
	const language = requestLanguage();
	const journal = getJournal(getDatabase(), { feedUrl: JOURNAL_FEED_URL });
	const recent = listDiaryEntries(getDatabase(), user.id)
		.slice(0, rowSize)
		.map((entry) => ({ ...asSummary(entry.work), rating: entry.rating }));

	if (!context) {
		const articles = await journal;
		return {
			state: 'not_configured' as const,
			articles: articles.ok ? articles.articles.slice(0, articleCount) : [],
			recent
		};
	}

	const [films, series, cinemas, upcoming, watchlist, lists, articles] = await Promise.all([
		getPopularFilms(context, language),
		getPopularSeries(context, language),
		getChart(context, 'now-playing', language),
		getChart(context, 'upcoming', language),
		loadWatchlist(user.id),
		loadLists(),
		journal
	]);
	return {
		state: 'ready' as const,
		films: films.ok ? films.value.slice(0, rowSize) : [],
		series: series.ok ? series.value.slice(0, rowSize) : [],
		cinemas: cinemas.ok ? cinemas.value.films.slice(0, rowSize) : [],
		upcoming: upcoming.ok ? upcoming.value.films.slice(0, rowSize) : [],
		watchlist,
		lists,
		articles: articles.ok ? articles.articles.slice(0, articleCount) : [],
		recent
	};
};
