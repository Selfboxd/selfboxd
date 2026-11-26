import { describe, expect, it } from 'vitest';
import { browseDecades, browseQuery } from '../../catalog/browse';
import { discoverParams, parseBrowseFilter } from './browse';

const now = new Date('2026-11-25T12:00:00Z');

function parse(query: string) {
	return parseBrowseFilter(new URLSearchParams(query), now);
}

describe('parseBrowseFilter', () => {
	it('defaults to the popular films', () => {
		expect(parse('')).toEqual({
			sort: 'popular',
			decade: null,
			year: null,
			genre: null,
			service: null,
			page: 1
		});
	});

	it('reads a complete filter', () => {
		expect(parse('sort=rating&decade=1980&genre=878&service=8&page=3')).toEqual({
			sort: 'rating',
			decade: 1980,
			year: null,
			genre: 878,
			service: 8,
			page: 3
		});
	});

	it('ignores values that are invalid or out of range', () => {
		expect(parse('sort=drop&decade=1985&year=1700&genre=abc&page=0')).toEqual(parse(''));
		expect(parse('decade=2030').decade).toBeNull();
		expect(parse('decade=1870').decade).toBeNull();
		expect(parse('year=2040').year).toBeNull();
		expect(parse('page=501').page).toBe(1);
		expect(parse('page=1e2').page).toBe(1);
		expect(parse('genre=0').genre).toBeNull();
	});
});

describe('discoverParams', () => {
	it('orders by popularity by default and never includes adult films', () => {
		expect(discoverParams(parse(''), now)).toEqual({
			include_adult: 'false',
			page: '1',
			sort_by: 'popularity.desc'
		});
	});

	it('uses the air dates and names of series', () => {
		expect(discoverParams(parse('decade=1980&sort=name'), now, 'series')).toMatchObject({
			sort_by: 'name.asc',
			'first_air_date.gte': '1980-01-01',
			'first_air_date.lte': '1989-12-31'
		});
		expect(discoverParams(parse('year=1999'), now, 'series').first_air_date_year).toBe('1999');
		expect(discoverParams(parse('sort=upcoming'), now, 'series')['first_air_date.gte']).toBe(
			now.toISOString().slice(0, 10)
		);
	});

	it('limits a decade to its ten years', () => {
		expect(discoverParams(parse('decade=1980'), now)).toMatchObject({
			'primary_release_date.gte': '1980-01-01',
			'primary_release_date.lte': '1989-12-31'
		});
	});

	it('prefers a year over a decade', () => {
		const params = discoverParams(parse('decade=1980&year=1982'), now);

		expect(params.primary_release_year).toBe('1982');
		expect(params['primary_release_date.gte']).toBeUndefined();
	});

	it('requires enough votes when ordering by rating', () => {
		expect(discoverParams(parse('sort=rating'), now)).toMatchObject({
			sort_by: 'vote_average.desc',
			'vote_count.gte': '300'
		});
		expect(discoverParams(parse('sort=rating_lowest'), now).sort_by).toBe('vote_average.asc');
	});

	it('starts upcoming films today', () => {
		expect(discoverParams(parse('sort=upcoming&decade=1980'), now)).toMatchObject({
			'primary_release_date.gte': '2026-11-25'
		});
	});

	it('passes the genre and the page', () => {
		expect(discoverParams(parse('genre=878&page=4'), now)).toMatchObject({
			with_genres: '878',
			page: '4'
		});
	});
});

describe('browse helpers', () => {
	it('lists decades from the current one down to the first', () => {
		const decades = browseDecades(now);

		expect(decades[0]).toBe(2020);
		expect(decades.at(-1)).toBe(1880);
	});

	it('builds a query without default values', () => {
		expect(browseQuery({ sort: 'popular', page: 1 })).toBe('');
		expect(browseQuery({ sort: 'rating', decade: 1980, genre: 878, page: 2 })).toBe(
			'sort=rating&decade=1980&genre=878&page=2'
		);
	});
});
