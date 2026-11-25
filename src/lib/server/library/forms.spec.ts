import { describe, expect, it } from 'vitest';
import { parseEntryForm, parseSeason, parseStatus } from './forms';

function form(values: Record<string, string>): FormData {
	const data = new FormData();
	for (const [name, value] of Object.entries(values)) data.set(name, value);
	return data;
}

describe('parseSeason', () => {
	it('reads a season number and an empty value as no season', () => {
		expect(parseSeason('')).toBeNull();
		expect(parseSeason('0')).toBe(0);
		expect(parseSeason('12')).toBe(12);
	});

	it('refuses anything that is not a whole number in range', () => {
		for (const value of ['-1', '1.5', 'two', '1000', ' 2']) {
			expect(parseSeason(value)).toBeUndefined();
		}
	});
});

describe('parseStatus', () => {
	it('reads the known statuses and an empty value as no change', () => {
		expect(parseStatus('')).toBeNull();
		expect(parseStatus('watching')).toBe('watching');
		expect(parseStatus('abandoned')).toBe('abandoned');
	});

	it('refuses an unknown status', () => {
		expect(parseStatus('paused')).toBeUndefined();
	});
});

describe('parseEntryForm', () => {
	const base = { watchedOn: '2026-01-10' };

	it('reads the season and status of a series', () => {
		expect(parseEntryForm(form({ ...base, season: '2', status: 'finished' }))).toMatchObject({
			ok: true,
			value: { season: 2, status: 'finished' }
		});
	});

	it('reports an invalid season or status', () => {
		expect(parseEntryForm(form({ ...base, season: 'x' }))).toEqual({
			ok: false,
			error: 'season_invalid'
		});
		expect(parseEntryForm(form({ ...base, status: 'x' }))).toEqual({
			ok: false,
			error: 'status_invalid'
		});
	});
});
