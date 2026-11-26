import type { FilmSummary } from './film';
import type { WorkKind } from './library';
import { listVisibilities, type ListVisibility } from './list-view';

/** Roles a person can be credited with on a person page, in the order of its tabs. */
export const personRoles = [
	'actor',
	'director',
	'co-director',
	'creator',
	'producer',
	'executive-producer',
	'writer',
	'original-writer',
	'story',
	'casting',
	'editor',
	'cinematography',
	'production-design',
	'art-direction',
	'set-decoration',
	'visual-effects',
	'composer',
	'sound',
	'costume-design',
	'makeup',
	'stunts'
] as const;

export type PersonRole = (typeof personRoles)[number];

/** Role of each TMDB crew job shown on person pages; other jobs are left out. */
export const jobRoles: Readonly<Record<string, PersonRole>> = {
	Director: 'director',
	'Co-Director': 'co-director',
	Creator: 'creator',
	Producer: 'producer',
	'Executive Producer': 'executive-producer',
	Screenplay: 'writer',
	Writer: 'writer',
	Teleplay: 'writer',
	Novel: 'original-writer',
	Book: 'original-writer',
	'Original Story': 'original-writer',
	'Short Story': 'original-writer',
	'Comic Book': 'original-writer',
	Characters: 'original-writer',
	Story: 'story',
	Casting: 'casting',
	Editor: 'editor',
	'Director of Photography': 'cinematography',
	'Production Design': 'production-design',
	'Art Direction': 'art-direction',
	'Set Decoration': 'set-decoration',
	'Visual Effects Supervisor': 'visual-effects',
	'Original Music Composer': 'composer',
	Music: 'composer',
	'Sound Designer': 'sound',
	'Supervising Sound Editor': 'sound',
	'Costume Design': 'costume-design',
	'Makeup Artist': 'makeup',
	'Stunt Coordinator': 'stunts',
	Stunts: 'stunts'
};

/** Role shown first for the department TMDB knows a person for. */
const departmentRoles: Readonly<Record<string, PersonRole>> = {
	Acting: 'actor',
	Directing: 'director',
	Writing: 'writer',
	Production: 'producer',
	Editing: 'editor',
	Camera: 'cinematography',
	Art: 'production-design',
	Sound: 'composer',
	'Costume & Make-Up': 'costume-design',
	'Visual Effects': 'visual-effects',
	Crew: 'stunts'
};

/** A film or a series a person is credited on, in one role. */
export interface PersonCredit extends FilmSummary {
	kind: WorkKind;
	role: PersonRole;
	/** Characters played, for the actor role. */
	character: string;
	/** Number of TMDB votes, telling how well known the work is. */
	votes: number;
	rating: number;
	/** Identifiers of the TMDB genres of the work. */
	genres: number[];
	/** Watch providers streaming the work, when they were loaded. */
	services?: number[];
}

export interface PersonDetails {
	id: number;
	name: string;
	biography: string;
	/** ISO date of birth. */
	birthday: string | null;
	/** ISO date of death. */
	deathday: string | null;
	placeOfBirth: string | null;
	profilePath: string | null;
	/** Department TMDB knows the person for, such as `Acting`. */
	department: string;
	credits: PersonCredit[];
}

export interface RoleCount {
	role: PersonRole;
	count: number;
}

/** Role matching the department TMDB knows a person for, when there is one. */
export function departmentRole(department: string): PersonRole | null {
	return departmentRoles[department] ?? null;
}

/** Roles the person is credited with and how many works each counts, in tab order. */
export function roleCounts(credits: PersonCredit[]): RoleCount[] {
	return personRoles
		.map((role) => ({ role, count: credits.filter((credit) => credit.role === role).length }))
		.filter((entry) => entry.count > 0);
}

/** The role a person page opens on: the one of the person's department, else the largest. */
export function defaultRole(person: Pick<PersonDetails, 'department' | 'credits'>): PersonRole {
	const counts = roleCounts(person.credits);
	const known = departmentRoles[person.department];
	if (known && counts.some((entry) => entry.role === known)) return known;
	const largest = counts.reduce<RoleCount | null>(
		(best, entry) => (best === null || entry.count > best.count ? entry : best),
		null
	);
	return largest?.role ?? 'actor';
}

export const personSorts = ['popular', 'newest', 'oldest', 'name', 'rating'] as const;

export type PersonSort = (typeof personSorts)[number];

export const personKinds = ['all', 'film', 'series'] as const;

export type PersonKind = (typeof personKinds)[number];

export interface PersonOptions {
	role: PersonRole;
	sort: PersonSort;
	kind: PersonKind;
	/** First year of a decade, such as 1980. */
	decade: number | null;
	/** Identifier of a TMDB genre. */
	genre: number | null;
	/** Identifier of a TMDB watch provider the works must stream on. */
	service: number | null;
	show: ListVisibility;
}

/** Reads the options of a person page from its query string, ignoring invalid values. */
export function parsePersonOptions(params: URLSearchParams, fallback: PersonRole): PersonOptions {
	const decade = params.get('decade');
	const genre = params.get('genre');
	const service = params.get('service');
	return {
		role: personRoles.find((role) => role === params.get('role')) ?? fallback,
		sort: personSorts.find((sort) => sort === params.get('sort')) ?? 'popular',
		kind: personKinds.find((kind) => kind === params.get('kind')) ?? 'all',
		decade: decade !== null && /^\d{3}0$/.test(decade) ? Number(decade) : null,
		genre: genre !== null && /^\d{1,6}$/.test(genre) ? Number(genre) : null,
		service: service !== null && /^\d{1,9}$/.test(service) ? Number(service) : null,
		show: listVisibilities.find((show) => show === params.get('show')) ?? 'all'
	};
}

/** Query string of a person page, leaving out default values. */
export function personQuery(options: PersonOptions, fallback: PersonRole): string {
	const params = new URLSearchParams();
	if (options.role !== fallback) params.set('role', options.role);
	if (options.kind !== 'all') params.set('kind', options.kind);
	if (options.decade !== null) params.set('decade', String(options.decade));
	if (options.genre !== null) params.set('genre', String(options.genre));
	if (options.service !== null) params.set('service', String(options.service));
	if (options.sort !== 'popular') params.set('sort', options.sort);
	if (options.show !== 'all') params.set('show', options.show);
	return params.toString();
}

function byYear(a: PersonCredit, b: PersonCredit, direction: 1 | -1): number {
	if (a.year === b.year) return 0;
	if (a.year === null) return 1;
	if (b.year === null) return -1;
	return (a.year - b.year) * direction;
}

const sorters: Record<PersonSort, (a: PersonCredit, b: PersonCredit) => number> = {
	popular: (a, b) => b.votes - a.votes,
	newest: (a, b) => byYear(a, b, -1),
	oldest: (a, b) => byYear(a, b, 1),
	name: (a, b) => a.title.localeCompare(b.title),
	rating: (a, b) => b.rating - a.rating
};

/** Credits of the role matching the options, in their order, each marked as watched or not. */
export function applyPersonOptions<T extends PersonCredit>(
	credits: T[],
	options: PersonOptions,
	watched: (credit: T) => boolean
): (T & { watched: boolean })[] {
	return credits
		.filter(
			(credit) =>
				credit.role === options.role &&
				(options.kind === 'all' || credit.kind === options.kind) &&
				(options.decade === null ||
					(credit.year !== null &&
						credit.year >= options.decade &&
						credit.year < options.decade + 10)) &&
				(options.genre === null || credit.genres.includes(options.genre)) &&
				(options.service === null || (credit.services ?? []).includes(options.service))
		)
		.map((credit) => ({ ...credit, watched: watched(credit) }))
		.filter((credit) => options.show === 'all' || credit.watched === (options.show === 'watched'))
		.toSorted(sorters[options.sort]);
}

/** Decades of the credits of a role, newest first. */
export function creditDecades(credits: PersonCredit[], role: PersonRole): number[] {
	const decades = new Set<number>();
	for (const credit of credits) {
		if (credit.role === role && credit.year !== null) {
			decades.add(Math.floor(credit.year / 10) * 10);
		}
	}
	return [...decades].sort((a, b) => b - a);
}
