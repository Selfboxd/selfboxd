import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listActivity } from '#lib/server/library/activity.js';
import { listDiaryEntries } from '#lib/server/library/diary.js';
import { listLists } from '#lib/server/library/lists.js';
import {
	getProfile,
	getProfileStats,
	getRatingHistogram,
	listFavourites
} from '#lib/server/library/profile.js';
import { pinnedLists, pinnedReviews } from '#lib/catalog/library.js';
import type { PageServerLoad } from './$types';

/** Number of entries shown in each section of the profile. */
const recentCount = 4;
const diaryCount = 10;
const reviewCount = 2;
const listCount = 3;
const activityCount = 5;

export const load: PageServerLoad = ({ locals }) => {
	const { user } = requireUser(locals);
	const db = getDatabase();
	const entries = listDiaryEntries(db, user.id);
	const lists = listLists(db, user.id);
	const pinned = pinnedReviews(entries);
	return {
		profile: getProfile(db, user.id),
		stats: getProfileStats(db, user.id),
		favourites: listFavourites(db, user.id),
		histogram: getRatingHistogram(db, user.id),
		recent: entries.slice(0, recentCount),
		diary: entries.slice(0, diaryCount),
		diaryCount: entries.length,
		pinned,
		reviews: entries
			.filter((entry) => entry.review && !pinned.includes(entry))
			.slice(0, reviewCount),
		pinnedLists: pinnedLists(lists),
		lists: lists.slice(0, listCount),
		activity: listActivity(db, user.id).slice(0, activityCount)
	};
};
