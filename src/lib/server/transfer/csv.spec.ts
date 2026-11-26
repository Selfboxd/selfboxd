import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from './csv';

describe('toCsv', () => {
	it('quotes what needs it and defuses formulas', () => {
		expect(
			toCsv(
				['A', 'B'],
				[
					['plain', 'a, "b"'],
					['=SUM(1)', null]
				]
			)
		).toBe('A,B\r\nplain,"a, ""b"""\r\n\'=SUM(1),\r\n');
	});
});

describe('parseCsv', () => {
	it('reads quoted fields across commas and line breaks', () => {
		expect(parseCsv('Name,Review\r\n"Crazy, Stupid, Love.","Line one\nline ""two"""\n')).toEqual([
			['Name', 'Review'],
			['Crazy, Stupid, Love.', 'Line one\nline "two"']
		]);
	});

	it('keeps empty fields and blank lines apart', () => {
		expect(parseCsv('﻿a,,c\n\nd')).toEqual([['a', '', 'c'], [''], ['d']]);
	});

	it('reads back what it writes', () => {
		const rows = [['x, y', 'quote "q"', 'multi\nline']];
		expect(parseCsv(toCsv(['A', 'B', 'C'], rows)).slice(1)).toEqual(rows);
	});
});
