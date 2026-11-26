import { randomUUID } from 'node:crypto';
import { getDatabase } from '../db/index';
import type { TmdbContext } from '../tmdb/service';
import { matchWork } from '../tmdb/service';
import {
	applyImport,
	reviewImport,
	type FilmMatches,
	type ImportChoices,
	type ImportReview,
	type ImportSummary
} from './importer';
import { parseLetterboxd, type LetterboxdExport } from './letterboxd';
import { readZip } from './zip';

/** Bounds on an uploaded archive. */
const archiveLimits = { files: 2_000, bytes: 50_000_000 };

/** Films looked up on TMDB at the same time. */
const lookups = 6;

/** Where an import stands, as the settings page shows it. */
export type ImportStatus =
	| { state: 'matching'; done: number; total: number }
	| { state: 'review'; review: ImportReview }
	| { state: 'done'; summary: ImportSummary }
	| { state: 'failed'; error: 'tmdb_failed' };

interface Job {
	id: string;
	userId: number;
	status: ImportStatus;
	data: LetterboxdExport;
	matches: FilmMatches;
}

/** The import of each account; one at a time, kept in memory until it is closed. */
const jobs = new Map<number, Job>();

async function match(job: Job, context: TmdbContext, language: string): Promise<void> {
	const films = [...job.data.films.values()];
	let next = 0;
	let done = 0;
	let failures = 0;
	const worker = async () => {
		while (next < films.length) {
			const film = films[next++];
			if (!film) break;
			const found = await matchWork(context, film.name, film.year, language);
			if (found.ok && found.value) job.matches.set(film.key, found.value);
			if (!found.ok) failures++;
			done++;
			if (job.status.state === 'matching')
				job.status = { state: 'matching', done, total: films.length };
		}
	};
	await Promise.all(Array.from({ length: lookups }, worker));
	if (jobs.get(job.userId) !== job) return;
	job.status =
		failures === films.length && films.length > 0
			? { state: 'failed', error: 'tmdb_failed' }
			: {
					state: 'review',
					review: reviewImport(getDatabase(), job.userId, job.data, job.matches)
				};
}

/**
 * Reads a Letterboxd archive and starts finding its films on TMDB, in the background.
 * Returns an error code when the file is not a Letterboxd export.
 */
export function startImport(
	userId: number,
	archive: Uint8Array,
	context: TmdbContext,
	language: string
): { ok: true } | { ok: false; error: 'import_invalid' } {
	const read = readZip(archive, archiveLimits);
	const data = read.ok ? parseLetterboxd(read.files) : null;
	if (!data) return { ok: false, error: 'import_invalid' };
	const job: Job = {
		id: randomUUID(),
		userId,
		status: { state: 'matching', done: 0, total: data.films.size },
		data,
		matches: new Map()
	};
	jobs.set(userId, job);
	void match(job, context, language).catch(() => {
		job.status = { state: 'failed', error: 'tmdb_failed' };
	});
	return { ok: true };
}

/** Where the import of an account stands, or `null` without one. */
export function importStatus(userId: number): (ImportStatus & { id: string }) | null {
	const job = jobs.get(userId);
	return job ? { ...job.status, id: job.id } : null;
}

/** Runs a reviewed import with the chosen settlements. Returns `null` when none waits. */
export function confirmImport(userId: number, choices: ImportChoices): ImportSummary | null {
	const job = jobs.get(userId);
	if (job?.status.state !== 'review') return null;
	const summary = applyImport(getDatabase(), userId, job.data, job.matches, choices);
	job.status = { state: 'done', summary };
	return summary;
}

/** Forgets the import of an account, whatever its state. */
export function closeImport(userId: number): void {
	jobs.delete(userId);
}
