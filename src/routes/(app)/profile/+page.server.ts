import { requireUser } from '#lib/server/auth/guards.js';
import { getDatabase } from '#lib/server/db/index.js';
import { listActivity } from '#lib/server/library/activity.js';
import { listDiaryEntries } from '#lib/server/library/diary.js';
import { listLists } from '#lib/server/library/lists.js';
import {
	getProfile,
	getProfileStats,
	getRatingHistogram,
	listFavourites,
	listTagCounts
} from '#lib/server/library/profile.js';
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
	return {
		profile: getProfile(db, user.id),
		stats: getProfileStats(db, user.id),
		favourites: listFavourites(db, user.id),
		histogram: getRatingHistogram(db, user.id),
		recent: entries.slice(0, recentCount),
		diary: entries.slice(0, diaryCount),
		diaryCount: entries.length,
		pinned: entries.filter((entry) => entry.pinned),
		reviews: entries.filter((entry) => entry.review && !entry.pinned).slice(0, reviewCount),
		lists: lists.slice(0, listCount),
		activity: listActivity(db, user.id).slice(0, activityCount),
		tags: listTagCounts(db, user.id)
	};
};
