import { desc, eq } from 'drizzle-orm';
import type { ActivityEvent } from '../../catalog/library';
import type { DatabaseExecutor } from '../db/connection';
import { diaryEntries, watchlistItems, works, workStates } from '../db/schema';

/** Largest number of events listed. */
export const activityLimit = 100;

/**
 * Latest actions of an account, newest first: diary entries, watchlist additions,
 * and films marked as watched or liked outside of the diary.
 */
export function listActivity(db: DatabaseExecutor, userId: number): ActivityEvent[] {
	const logged = db
		.select({ entry: diaryEntries, work: works })
		.from(diaryEntries)
		.innerJoin(works, eq(diaryEntries.workId, works.id))
		.where(eq(diaryEntries.userId, userId))
		.orderBy(desc(diaryEntries.createdAt), desc(diaryEntries.id))
		.limit(activityLimit)
		.all();
	const listed = db
		.select({ item: watchlistItems, work: works })
		.from(watchlistItems)
		.innerJoin(works, eq(watchlistItems.workId, works.id))
		.where(eq(watchlistItems.userId, userId))
		.orderBy(desc(watchlistItems.addedAt))
		.limit(activityLimit)
		.all();
	const states = db
		.select({ state: workStates, work: works })
		.from(workStates)
		.innerJoin(works, eq(workStates.workId, works.id))
		.where(eq(workStates.userId, userId))
		.orderBy(desc(workStates.updatedAt))
		.limit(activityLimit * 2)
		.all();

	const loggedWorks = new Set(logged.map((row) => row.work.id));
	const events: ActivityEvent[] = [
		...logged.map(({ entry, work }) => ({
			kind: 'logged' as const,
			work,
			at: entry.createdAt,
			rating: entry.rating,
			liked: entry.liked,
			rewatch: entry.rewatch,
			reviewed: entry.review !== ''
		})),
		...listed.map(({ item, work }) => ({
			kind: 'watchlisted' as const,
			work,
			at: item.addedAt,
			rating: null,
			liked: false,
			rewatch: false,
			reviewed: false
		})),
		...states
			.filter(({ state, work }) => !loggedWorks.has(work.id) && (state.watched || state.liked))
			.map(({ state, work }) => ({
				kind: state.watched ? ('watched' as const) : ('liked' as const),
				work,
				at: state.updatedAt,
				rating: state.rating,
				liked: state.liked,
				rewatch: false,
				reviewed: false
			}))
	];
	return events.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, activityLimit);
}
