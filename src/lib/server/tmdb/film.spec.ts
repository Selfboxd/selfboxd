import { readFileSync } from 'node:fs';
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { toCollection, toFilm } from './film';
import { collectionSchema, filmDetailsSchema } from './schemas';

const raw = v.parse(
	filmDetailsSchema,
	JSON.parse(readFileSync('e2e/support/tmdb/film-78.json', 'utf8'))
);

describe('toFilm', () => {
	const film = toFilm(raw, 'US');

	it('keeps the header information', () => {
		expect(film).toMatchObject({
			id: 78,
			title: 'Blade Runner',
			year: 1982,
			runtime: 118,
			posterPath: '/blade-runner-poster.jpg',
			backdropPath: '/blade-runner-backdrop.jpg'
		});
	});

	it('keeps the other titles, without the title and duplicates', () => {
		expect(film.alternativeTitles).toEqual(['Der Blade Runner', 'ブレードランナー']);
	});

	it('separates the directors from the rest of the crew', () => {
		expect(film.directors).toEqual([{ id: 578, name: 'Ridley Scott', profilePath: null }]);
		expect(film.crew.map((group) => group.job)).not.toContain('Director');
	});

	it('groups the crew by job', () => {
		expect(film.crew[0]).toEqual({
			job: 'Screenplay',
			people: [
				{ id: 583, name: 'Hampton Fancher' },
				{ id: 584, name: 'David Webb Peoples' }
			]
		});
	});

	it('prefers the official trailer', () => {
		expect(film.trailerKey).toBe('official-trailer-key');
	});

	it('lists the releases by date', () => {
		expect(film.releases).toEqual([
			{ country: 'US', date: '1982-06-25', type: 'theatrical', certification: 'R' },
			{ country: 'FR', date: '1982-09-15', type: 'theatrical', certification: '' }
		]);
	});

	it('keeps the streaming offers of the requested country only', () => {
		expect(film.watch?.stream.map((provider) => provider.name)).toEqual(['Netflix']);
		expect(film.watch?.rent.map((provider) => provider.name)).toEqual(['Apple TV']);
		expect(film.watch?.buy).toEqual([]);
		expect(toFilm(raw, 'FR').watch).toBeNull();
	});

	it('replaces an offers link that does not point to TMDB', () => {
		const forged = v.parse(filmDetailsSchema, {
			...raw,
			'watch/providers': { results: { US: { link: 'javascript:alert(1)' } } }
		});

		expect(toFilm(forged, 'US').watch?.link).toBe('https://www.themoviedb.org/');
	});

	it('copes with a film that has almost no data', () => {
		const bare = v.parse(filmDetailsSchema, {
			...raw,
			release_date: '',
			tagline: null,
			runtime: 0,
			poster_path: null,
			belongs_to_collection: null,
			videos: { results: [] }
		});

		expect(toFilm(bare, 'US')).toMatchObject({
			year: null,
			tagline: '',
			runtime: null,
			posterPath: null,
			trailerKey: null,
			collection: null
		});
	});
});

describe('toCollection', () => {
	it('orders the films by release year, unreleased ones last', () => {
		const collection = toCollection(
			v.parse(collectionSchema, {
				id: 1,
				name: 'Saga',
				parts: [
					{ id: 3, title: 'Third', release_date: '', poster_path: null },
					{ id: 2, title: 'Second', release_date: '2017-10-04', poster_path: null },
					{ id: 1, title: 'First', release_date: '1982-06-25', poster_path: null }
				]
			})
		);

		expect(collection.films.map((film) => film.title)).toEqual(['First', 'Second', 'Third']);
	});
});
