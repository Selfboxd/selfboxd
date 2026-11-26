import type { WorkKind } from '../../catalog/library';
import {
	computeStats,
	type Stats,
	type StatsInputEntry,
	type StatsInputWork
} from '../../catalog/stats';
import type { DatabaseExecutor } from '../db/connection';
import type { TmdbContext } from '../tmdb/service';
import { listDiaryEntries } from './diary';
import { ensureFacts, readFacts } from './facts';
import { listWatched } from './watched';

/** The watched works and the diary of an account, in the shape statistics read. */
export function statsInput(
	db: DatabaseExecutor,
	userId: number
): { works: StatsInputWork[]; entries: StatsInputEntry[]; years: number[] } {
	const watched = listWatched(db, userId);
	const diary = listDiaryEntries(db, userId);
	const all = new Map(watched.map((item) => [item.work.id, item]));
	for (const entry of diary) {
		if (!all.has(entry.work.id)) {
			all.set(entry.work.id, { work: entry.work, rating: entry.rating, liked: entry.liked });
		}
	}
	const list = [...all.values()];
	const facts = readFacts(
		db,
		list.map((item) => item.work.id)
	);
	const positions = new Map(list.map((item, index) => [item.work.id, index]));
	return {
		works: list.map((item) => ({
			work: {
				kind: item.work.kind,
				id: item.work.externalId,
				title: item.work.title,
				year: item.work.year,
				posterPath: item.work.posterPath
			},
			rating: item.rating,
			facts: facts.get(item.work.id) ?? null
		})),
		entries: diary.map((entry) => ({
			work: positions.get(entry.work.id) ?? -1,
			watchedOn: entry.watchedOn,
			rating: entry.rating,
			rewatch: entry.rewatch,
			reviewed: entry.review.trim() !== ''
		})),
		years: [...new Set(diary.map((entry) => Number(entry.watchedOn.slice(0, 4))))].sort(
			(a, b) => b - a
		)
	};
}

/** Loads from TMDB the facts of the works of an account that statistics still miss. */
export async function ensureAccountFacts(
	db: DatabaseExecutor,
	context: TmdbContext,
	userId: number
): Promise<void> {
	const works = new Map(
		[
			...listWatched(db, userId).map((item) => item.work),
			...listDiaryEntries(db, userId).map((entry) => entry.work)
		].map((work) => [work.id, work])
	);
	await ensureFacts(db, context, [...works.values()]);
}

/**
 * Loads the facts the statistics of an account need, then computes them for a year it logged
 * in, or for all time.
 */
export async function loadStats(
	db: DatabaseExecutor,
	context: TmdbContext | undefined,
	userId: number,
	options: { year: number | null; kind: WorkKind | null }
): Promise<{ stats: Stats; years: number[]; year: number | null }> {
	if (context) await ensureAccountFacts(db, context, userId);
	const input = statsInput(db, userId);
	const year = options.year !== null && input.years.includes(options.year) ? options.year : null;
	return {
		stats: computeStats(input.works, input.entries, { ...options, year }),
		years: input.years,
		year
	};
}

/** Years of statistics sent with a public profile, besides all time. */
const publicYears = 10;

/** The statistics sent with a public profile: all time and the latest years, films and series together. */
export function publicStats(db: DatabaseExecutor, userId: number) {
	const input = statsInput(db, userId);
	return {
		all: computeStats(input.works, input.entries, { year: null, kind: null }),
		years: input.years.slice(0, publicYears).map((year) => ({
			year,
			stats: computeStats(input.works, input.entries, { year, kind: null })
		}))
	};
}
