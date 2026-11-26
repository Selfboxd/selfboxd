import { inArray } from 'drizzle-orm';
import type { Film } from '../../catalog/film';
import type { Work } from '../../catalog/library';
import type { Series } from '../../catalog/series';
import type { WorkFacts } from '../../catalog/stats';
import type { DatabaseExecutor } from '../db/connection';
import { workFacts } from '../db/schema';
import type { TmdbContext } from '../tmdb/service';
import { loadWorkDetails } from './resolve';

/** Age after which the facts of a work are loaded again, in milliseconds. */
const factsLifetime = 30 * 24 * 60 * 60 * 1000;
/** Works loaded from TMDB at the same time. */
const parallelLoads = 6;
/** Members of the cast kept for each work. */
const castKept = 8;

/** The facts statistics keep from the details of a film or a series. */
export function factsOf(details: Film | Series): WorkFacts {
	const person = ({
		id,
		name,
		profilePath
	}: {
		id: number;
		name: string;
		profilePath?: string | null;
	}) => ({
		id,
		name,
		profilePath: profilePath ?? null
	});
	return {
		runtime: 'runtime' in details ? details.runtime : null,
		genres: details.genres,
		countries: details.countries,
		language: details.originalLanguage,
		directors: ('directors' in details ? details.directors : details.creators).map(person),
		cast: details.cast.slice(0, castKept).map(person),
		studios: details.studios.map(({ id, name }) => ({ id, name }))
	};
}

/** The stored facts of the given works, by work identifier. */
export function readFacts(db: DatabaseExecutor, workIds: number[]): Map<number, WorkFacts> {
	if (workIds.length === 0) return new Map();
	const rows = db.select().from(workFacts).where(inArray(workFacts.workId, workIds)).all();
	return new Map(rows.map((row) => [row.workId, row.facts]));
}

/**
 * Loads from TMDB the facts of the works that have none yet or old ones, a few at a time.
 * A work TMDB cannot answer for keeps what it had.
 */
export async function ensureFacts(
	db: DatabaseExecutor,
	context: TmdbContext,
	works: Work[],
	now = new Date()
): Promise<void> {
	if (works.length === 0) return;
	const fresh = new Set(
		db
			.select({ workId: workFacts.workId, fetchedAt: workFacts.fetchedAt })
			.from(workFacts)
			.where(
				inArray(
					workFacts.workId,
					works.map((work) => work.id)
				)
			)
			.all()
			.filter((row) => now.getTime() - row.fetchedAt.getTime() < factsLifetime)
			.map((row) => row.workId)
	);
	const missing = works.filter((work) => !fresh.has(work.id));
	let next = 0;
	const worker = async () => {
		while (next < missing.length) {
			const work = missing[next++];
			if (!work) break;
			const details = await loadWorkDetails(context, work.kind, work.externalId);
			if (!details.ok) continue;
			const facts = factsOf(details.value);
			db.insert(workFacts)
				.values({ workId: work.id, facts, fetchedAt: now })
				.onConflictDoUpdate({ target: workFacts.workId, set: { facts, fetchedAt: now } })
				.run();
		}
	};
	await Promise.all(Array.from({ length: parallelLoads }, worker));
}
