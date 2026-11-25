import { describe, expect, it } from 'vitest';
import {
	applyPersonOptions,
	creditDecades,
	defaultRole,
	parsePersonOptions,
	personQuery,
	roleCounts,
	type PersonCredit,
	type PersonOptions
} from './person';

function credit(id: number, changes: Partial<PersonCredit> = {}): PersonCredit {
	return {
		kind: 'film',
		id,
		title: `Work ${String(id)}`,
		year: 2000,
		posterPath: null,
		role: 'actor',
		character: '',
		votes: 0,
		rating: 0,
		genres: [],
		...changes
	};
}

const options: PersonOptions = {
	role: 'actor',
	sort: 'popular',
	kind: 'all',
	decade: null,
	genre: null,
	show: 'all'
};

describe('person roles', () => {
	const credits = [
		credit(1),
		credit(2, { role: 'director' }),
		credit(3, { role: 'director' }),
		credit(4, { role: 'producer' })
	];

	it('counts the works of each role in tab order', () => {
		expect(roleCounts(credits)).toEqual([
			{ role: 'actor', count: 1 },
			{ role: 'director', count: 2 },
			{ role: 'producer', count: 1 }
		]);
	});

	it('opens on the role of the department of the person', () => {
		expect(defaultRole({ department: 'Production', credits })).toBe('producer');
	});

	it('opens on the largest role when the department has no work', () => {
		expect(defaultRole({ department: 'Writing', credits })).toBe('director');
		expect(defaultRole({ department: '', credits: [] })).toBe('actor');
	});
});

describe('person options', () => {
	it('reads valid options and ignores the others', () => {
		const params = new URLSearchParams(
			'role=director&sort=oldest&kind=series&decade=1980&genre=878&show=watched'
		);
		expect(parsePersonOptions(params, 'actor')).toEqual({
			role: 'director',
			sort: 'oldest',
			kind: 'series',
			decade: 1980,
			genre: 878,
			show: 'watched'
		});
		expect(
			parsePersonOptions(
				new URLSearchParams('role=boss&sort=x&kind=book&decade=1985&genre=a&show=no'),
				'writer'
			)
		).toEqual({ ...options, role: 'writer' });
	});

	it('leaves default values out of the query', () => {
		expect(personQuery({ ...options, role: 'director' }, 'director')).toBe('');
		expect(personQuery({ ...options, sort: 'name', decade: 1990 }, 'director')).toBe(
			'role=actor&decade=1990&sort=name'
		);
	});
});

describe('person works', () => {
	const credits = [
		credit(1, { year: 1982, votes: 5, rating: 8, genres: [878] }),
		credit(2, { year: 2017, votes: 9, rating: 7, kind: 'series' }),
		credit(3, { year: null, votes: 1, title: 'Alpha' }),
		credit(4, { role: 'director', year: 1985 })
	];

	const ids = (change: Partial<PersonOptions>, watched = (entry: PersonCredit) => entry.id === 1) =>
		applyPersonOptions(credits, { ...options, ...change }, watched).map((entry) => entry.id);

	it('keeps the works of the role, most popular first', () => {
		expect(ids({})).toEqual([2, 1, 3]);
	});

	it('orders by year with unknown years last', () => {
		expect(ids({ sort: 'newest' })).toEqual([2, 1, 3]);
		expect(ids({ sort: 'oldest' })).toEqual([1, 2, 3]);
		expect(ids({ sort: 'name' })).toEqual([3, 1, 2]);
		expect(ids({ sort: 'rating' })).toEqual([1, 2, 3]);
	});

	it('narrows by kind, decade, genre and what was watched', () => {
		expect(ids({ kind: 'series' })).toEqual([2]);
		expect(ids({ decade: 1980 })).toEqual([1]);
		expect(ids({ genre: 878 })).toEqual([1]);
		expect(ids({ show: 'watched' })).toEqual([1]);
		expect(ids({ show: 'unwatched' })).toEqual([2, 3]);
	});

	it('marks the watched works', () => {
		const works = applyPersonOptions(credits, options, (entry) => entry.id === 2);
		expect(works.map((entry) => entry.watched)).toEqual([true, false, false]);
	});

	it('lists the decades of a role, newest first', () => {
		expect(creditDecades(credits, 'actor')).toEqual([2010, 1980]);
		expect(creditDecades(credits, 'director')).toEqual([1980]);
	});
});
