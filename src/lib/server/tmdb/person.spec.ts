import { describe, expect, it } from 'vitest';
import { toCredits, toPerson, toStudio } from './person';
import type { RawPerson } from './schemas';

type RawCredit = RawPerson['combined_credits']['cast'][number] &
	RawPerson['combined_credits']['crew'][number];

const film = { id: 78, media_type: 'movie', title: 'Blade Runner', release_date: '1982-06-25' };
const show = { id: 1400, media_type: 'tv', name: 'Neon Precinct', first_air_date: '2019-01-01' };

function credit(entry: Partial<RawCredit>, extra: Partial<RawCredit> = {}): RawCredit {
	return {
		id: 0,
		media_type: '',
		job: '',
		character: null,
		title: null,
		name: null,
		release_date: null,
		first_air_date: null,
		poster_path: null,
		vote_count: 1,
		episode_count: null,
		vote_average: 7,
		genre_ids: [],
		...entry,
		...extra
	};
}

describe('person credits', () => {
	it('keeps the kind, title and year of films and series', () => {
		const credits = toCredits({
			cast: [credit(film, { character: 'Deckard' }), credit(show, { character: 'Chief' })],
			crew: []
		});

		expect(credits).toMatchObject([
			{
				kind: 'film',
				id: 78,
				title: 'Blade Runner',
				year: 1982,
				role: 'actor',
				character: 'Deckard'
			},
			{ kind: 'series', id: 1400, title: 'Neon Precinct', year: 2019, role: 'actor' }
		]);
	});

	it('groups crew jobs into roles and leaves out unknown jobs', () => {
		const credits = toCredits({
			cast: [],
			crew: [
				credit(film, { job: 'Screenplay' }),
				credit(film, { job: 'Writer' }),
				credit(film, { job: 'Director' }),
				credit(film, { job: 'Thanks' })
			]
		});

		expect(credits.map((entry) => entry.role)).toEqual(['writer', 'director']);
	});

	it('joins the characters of an actor playing several parts in a work', () => {
		const credits = toCredits({
			cast: [
				credit(show, { character: 'Chief' }),
				credit(show, { character: 'Narrator' }),
				credit(show, { character: 'Chief' })
			],
			crew: []
		});

		expect(credits).toHaveLength(1);
		expect(credits[0]?.character).toBe('Chief / Narrator');
	});

	it('leaves out guest parts and appearances as oneself in series', () => {
		const credits = toCredits({
			cast: [
				credit(show, { id: 1, character: 'Guest', episode_count: 2 }),
				credit(show, { id: 2, character: 'Himself - Host', episode_count: 40 }),
				credit(show, { id: 3, character: 'Lead', episode_count: 10 }),
				credit(film, { character: 'Self' })
			],
			crew: [credit(show, { id: 4, job: 'Director', episode_count: 1 })]
		});

		expect(credits.map((entry) => `${entry.role}:${String(entry.id)}`)).toEqual([
			'actor:3',
			'actor:78',
			'director:4'
		]);
	});

	it('replaces the non-breaking spaces of a biography', () => {
		expect(
			toPerson({
				id: 1,
				name: 'A',
				biography: 'Sir\u00a0Ridley Scott',
				birthday: null,
				deathday: null,
				place_of_birth: null,
				profile_path: null,
				known_for_department: null,
				combined_credits: { cast: [], crew: [] }
			}).biography
		).toBe('Sir Ridley Scott');
	});

	it('leaves out talk shows, news and people', () => {
		const credits = toCredits({
			cast: [
				credit(show, { id: 1, genre_ids: [10767] }),
				credit(show, { id: 2, genre_ids: [10763] }),
				credit({ id: 3, media_type: 'person' }),
				credit(film, { genre_ids: [10767] })
			],
			crew: []
		});

		expect(credits.map((entry) => entry.id)).toEqual([78]);
	});
});

describe('person details', () => {
	it('turns empty TMDB values into null', () => {
		const person = toPerson({
			id: 578,
			name: 'Ridley Scott',
			biography: '  A director.  ',
			birthday: '',
			deathday: null,
			place_of_birth: '',
			profile_path: null,
			known_for_department: null,
			combined_credits: { cast: [], crew: [] }
		});

		expect(person).toEqual({
			id: 578,
			name: 'Ridley Scott',
			biography: 'A director.',
			birthday: null,
			deathday: null,
			placeOfBirth: null,
			profilePath: null,
			department: '',
			credits: []
		});
	});

	it('converts a company', () => {
		expect(
			toStudio({
				id: 174,
				name: 'Warner Bros. Pictures',
				description: '',
				headquarters: 'Burbank',
				homepage: null,
				logo_path: '/logo.png',
				origin_country: 'US'
			})
		).toEqual({
			id: 174,
			name: 'Warner Bros. Pictures',
			description: '',
			headquarters: 'Burbank',
			country: 'US',
			logoPath: '/logo.png'
		});
	});
});
