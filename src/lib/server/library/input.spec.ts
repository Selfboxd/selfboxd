import { describe, expect, it } from 'vitest';
import { parseRating, parseTags, parseViewingDate } from './input';

const now = new Date('2026-06-15T12:00:00Z');

describe('parseViewingDate', () => {
	it.each(['2026-06-15', '2026-06-16', '1999-12-31', '2024-02-29'])('accepts %s', (value) => {
		expect(parseViewingDate(value, now)).toBe(value);
	});

	it.each(['2026-06-17', '2027-01-01', '1879-12-31', '2025-02-29', '2026-13-01', '15/06/2026', ''])(
		'rejects %s',
		(value) => {
			expect(parseViewingDate(value, now)).toBeUndefined();
		}
	);
});

describe('parseRating', () => {
	it('accepts every whole number from 1 to 10', () => {
		expect(['1', '5', '10'].map(parseRating)).toEqual([1, 5, 10]);
	});

	it('reads an empty value and zero as no rating', () => {
		expect([parseRating(''), parseRating('0')]).toEqual([null, null]);
	});

	it.each(['11', '-1', '3.5', 'abc', '1e1'])('rejects %s', (value) => {
		expect(parseRating(value)).toBeUndefined();
	});
});

describe('parseTags', () => {
	it('trims, lower-cases and removes duplicates', () => {
		expect(parseTags(' Netflix, cinema ,netflix,, Late  Night ')).toEqual([
			'netflix',
			'cinema',
			'late night'
		]);
	});

	it('limits the length and the number of tags', () => {
		const names = Array.from({ length: 30 }, (_, index) => `tag${String(index)}`).join(',');

		expect(parseTags(names)).toHaveLength(20);
		expect(parseTags('x'.repeat(80))[0]).toHaveLength(50);
	});

	it('returns nothing for an empty value', () => {
		expect(parseTags(' , ')).toEqual([]);
	});
});
