import type { Company, Person } from './film';
import type { WorkKind } from './library';

/** What statistics need to know about a work, kept from its TMDB details. */
export interface WorkFacts {
	/** Running time in minutes of a film, `null` for a series or when unknown. */
	runtime: number | null;
	genres: string[];
	/** ISO 3166-1 codes of the production countries. */
	countries: string[];
	/** ISO 639-1 code of the original language. */
	language: string;
	/** Directors of a film, creators of a series. */
	directors: Person[];
	/** First names of the cast. */
	cast: Person[];
	studios: Company[];
}

/** A work as statistics show it. */
export interface StatsWork {
	kind: WorkKind;
	/** Identifier of the work at TMDB. */
	id: string;
	title: string;
	year: number | null;
	posterPath: string | null;
}

export interface StatsCount {
	name: string;
	count: number;
	/** Average rating from 1 to 10, `null` without rated works. */
	average: number | null;
}

export interface StatsPerson {
	person: Person;
	count: number;
}

/** The statistics of an account over a period, for films, series or both. */
export interface Stats {
	totals: {
		works: number;
		films: number;
		series: number;
		/** Hours spent on films, rewatches included. */
		hours: number;
		directors: number;
		countries: number;
		entries: number;
		reviews: number;
		rewatches: number;
		/** Average rating from 1 to 10. */
		average: number | null;
		/** Longest run of weeks with at least one diary entry. */
		streakWeeks: number;
		/** Monday of the first week of the longest run, as an ISO date. */
		streakStart: string | null;
		/** Days with two diary entries or more. */
		busyDays: number;
	};
	/** Works and average rating by year of release, every year between the first and the last. */
	releases: { year: number; count: number; average: number | null }[];
	/** Diary entries by year for all time, by month for a year. */
	diary: { label: string; count: number }[];
	/** Diary entries by day of the week, Monday first. */
	weekdays: number[];
	/** Rated works for each rating from 1 to 10. */
	ratings: number[];
	decades: { decade: number; average: number; count: number; best: StatsWork[] }[];
	genres: StatsCount[];
	countries: StatsCount[];
	languages: StatsCount[];
	mostWatched: { work: StatsWork; count: number }[];
	cast: StatsPerson[];
	directors: StatsPerson[];
	studios: { name: string; count: number }[];
}

/** A watched work with its state and its facts, as statistics read them. */
export interface StatsInputWork {
	work: StatsWork;
	rating: number | null;
	facts: WorkFacts | null;
}

export interface StatsInputEntry {
	/** Index of the work among the works of the input. */
	work: number;
	watchedOn: string;
	rating: number | null;
	rewatch: boolean;
	reviewed: boolean;
}

/** Rows of each list of people and studios kept in statistics. */
const listSize = 10;
/** Rows of each list of genres, countries and languages kept in statistics. */
const breakdownSize = 30;
/** Rated works a decade or a name needs before its average counts. */
const minimumRated = 2;
const day = 24 * 60 * 60 * 1000;

function average(values: number[]): number | null {
	return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Monday of the week of a day, as a count of days since the first Monday of 1970. */
function weekOf(date: string): number {
	const time = Date.parse(`${date}T00:00:00Z`);
	return Math.floor((time / day + 3) / 7);
}

function counted<T>(
	items: { key: string; value: T; rating: number | null }[],
	limit = listSize
): { value: T; count: number; average: number | null }[] {
	const groups = new Map<string, { value: T; count: number; ratings: number[] }>();
	for (const item of items) {
		const group = groups.get(item.key) ?? { value: item.value, count: 0, ratings: [] };
		group.count++;
		if (item.rating !== null) group.ratings.push(item.rating);
		groups.set(item.key, group);
	}
	return [...groups.values()]
		.map((group) => ({ value: group.value, count: group.count, average: average(group.ratings) }))
		.sort((a, b) => b.count - a.count || (b.average ?? 0) - (a.average ?? 0))
		.slice(0, limit);
}

/** Names ranked by count, with their average rating when enough of their works are rated. */
function ranked(items: { name: string; rating: number | null }[]): StatsCount[] {
	const all = counted(
		items.map((item) => ({ key: item.name, value: item.name, rating: item.rating })),
		breakdownSize
	);
	return all.map((entry) => ({
		name: entry.value,
		count: entry.count,
		average:
			items.filter((item) => item.name === entry.value && item.rating !== null).length >=
			minimumRated
				? entry.average
				: null
	}));
}

/**
 * Statistics of the given works and diary entries: `year` narrows them to the works logged that
 * year, `kind` to films or series.
 */
export function computeStats(
	works: StatsInputWork[],
	entries: StatsInputEntry[],
	options: { year: number | null; kind: WorkKind | null }
): Stats {
	const wanted = (index: number) => {
		const item = works[index];
		return item !== undefined && (options.kind === null || item.work.kind === options.kind);
	};
	const diary = entries.filter(
		(entry) =>
			wanted(entry.work) &&
			(options.year === null || entry.watchedOn.startsWith(`${String(options.year)}-`))
	);
	const indexes =
		options.year === null
			? works.map((_, index) => index).filter(wanted)
			: [...new Set(diary.map((entry) => entry.work))];
	const chosen = indexes.flatMap((index) => {
		const item = works[index];
		return item ? [{ ...item, index }] : [];
	});
	const rating = (item: StatsInputWork) => item.rating;
	const rated = chosen.flatMap((item) => (item.rating === null ? [] : [item.rating]));

	const viewings = new Map<number, number>();
	for (const entry of diary) viewings.set(entry.work, (viewings.get(entry.work) ?? 0) + 1);
	const minutes = chosen.reduce(
		(sum, item) => sum + (item.facts?.runtime ?? 0) * Math.max(1, viewings.get(item.index) ?? 0),
		0
	);

	const weeks = [...new Set(diary.map((entry) => weekOf(entry.watchedOn)))].sort((a, b) => a - b);
	let streakWeeks = 0;
	let streakStart: number | null = null;
	for (let start = 0; start < weeks.length;) {
		let end = start;
		while (end + 1 < weeks.length && weeks[end + 1] === (weeks[end] ?? 0) + 1) end++;
		if (end - start + 1 > streakWeeks) {
			streakWeeks = end - start + 1;
			streakStart = weeks[start] ?? null;
		}
		start = end + 1;
	}
	const days = new Map<string, number>();
	for (const entry of diary) days.set(entry.watchedOn, (days.get(entry.watchedOn) ?? 0) + 1);

	const directors = new Set(
		chosen.flatMap((item) => item.facts?.directors.map((person) => person.id) ?? [])
	);
	const countries = new Set(chosen.flatMap((item) => item.facts?.countries ?? []));

	const years = chosen.flatMap((item) => (item.work.year === null ? [] : [item.work.year]));
	const first = Math.min(...years);
	const last = Math.max(...years);
	const releases =
		years.length === 0
			? []
			: Array.from({ length: last - first + 1 }, (_, offset) => {
					const year = first + offset;
					const ofYear = chosen.filter((item) => item.work.year === year);
					return {
						year,
						count: ofYear.length,
						average: average(ofYear.flatMap((item) => (item.rating === null ? [] : [item.rating])))
					};
				});

	const diaryCounts =
		options.year === null
			? (() => {
					const byYear = new Map<string, number>();
					for (const entry of diary) {
						const year = entry.watchedOn.slice(0, 4);
						byYear.set(year, (byYear.get(year) ?? 0) + 1);
					}
					return [...byYear.entries()]
						.sort(([a], [b]) => a.localeCompare(b))
						.map(([label, count]) => ({ label, count }));
				})()
			: Array.from({ length: 12 }, (_, month) => ({
					label: String(month + 1).padStart(2, '0'),
					count: diary.filter((entry) => Number(entry.watchedOn.slice(5, 7)) === month + 1).length
				}));

	const weekdays = Array.from({ length: 7 }, () => 0);
	for (const entry of diary) {
		const weekday = (new Date(`${entry.watchedOn}T00:00:00Z`).getUTCDay() + 6) % 7;
		weekdays[weekday] = (weekdays[weekday] ?? 0) + 1;
	}

	const ratings = Array.from(
		{ length: 10 },
		(_, index) => rated.filter((value) => value === index + 1).length
	);

	const decades = [
		...new Set(
			chosen.flatMap((item) =>
				item.work.year === null ? [] : [Math.floor(item.work.year / 10) * 10]
			)
		)
	]
		.flatMap((decade) => {
			const ofDecade = chosen.filter(
				(item) =>
					item.work.year !== null && item.work.year >= decade && item.work.year < decade + 10
			);
			const scores = ofDecade.flatMap((item) => (item.rating === null ? [] : [item.rating]));
			const mean = average(scores);
			if (mean === null || scores.length < minimumRated) return [];
			const best = ofDecade
				.filter((item) => item.rating !== null)
				.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
				.slice(0, 6)
				.map((item) => item.work);
			return [{ decade, average: mean, count: ofDecade.length, best }];
		})
		.sort((a, b) => b.average - a.average || b.count - a.count)
		.slice(0, 3);

	const people = (pick: (facts: WorkFacts) => Person[]) =>
		counted(
			chosen.flatMap((item) =>
				(item.facts ? pick(item.facts) : []).map((person) => ({
					key: String(person.id),
					value: person,
					rating: rating(item)
				}))
			)
		).map((entry) => ({ person: entry.value, count: entry.count }));

	return {
		totals: {
			works: chosen.length,
			films: chosen.filter((item) => item.work.kind === 'film').length,
			series: chosen.filter((item) => item.work.kind === 'series').length,
			hours: Math.round(minutes / 60),
			directors: directors.size,
			countries: countries.size,
			entries: diary.length,
			reviews: diary.filter((entry) => entry.reviewed).length,
			rewatches: diary.filter((entry) => entry.rewatch).length,
			average: average(rated),
			streakWeeks,
			streakStart:
				streakStart === null
					? null
					: new Date((streakStart * 7 - 3) * day).toISOString().slice(0, 10),
			busyDays: [...days.values()].filter((count) => count >= 2).length
		},
		releases,
		diary: diaryCounts,
		weekdays,
		ratings,
		decades,
		genres: ranked(
			chosen.flatMap((item) =>
				(item.facts?.genres ?? []).map((name) => ({ name, rating: rating(item) }))
			)
		),
		countries: ranked(
			chosen.flatMap((item) =>
				(item.facts?.countries ?? []).map((name) => ({ name, rating: rating(item) }))
			)
		),
		languages: ranked(
			chosen.flatMap((item) =>
				item.facts?.language ? [{ name: item.facts.language, rating: rating(item) }] : []
			)
		),
		mostWatched: chosen
			.map((item) => ({ work: item.work, count: viewings.get(item.index) ?? 0 }))
			.filter((entry) => entry.count >= 2)
			.sort((a, b) => b.count - a.count)
			.slice(0, 12),
		cast: people((facts) => facts.cast),
		directors: people((facts) => facts.directors),
		studios: counted(
			chosen.flatMap((item) =>
				(item.facts?.studios ?? []).map((studio) => ({
					key: String(studio.id),
					value: studio.name,
					rating: null
				}))
			)
		).map((entry) => ({ name: entry.value, count: entry.count }))
	};
}
