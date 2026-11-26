/** Characters that oblige a CSV field to be quoted. */
const special = /[",\r\n]/;

/** Characters a spreadsheet would read as the start of a formula. */
const formulaStart = /^[=+\-@\t\r]/;

function field(value: string): string {
	const safe = formulaStart.test(value) ? `'${value}` : value;
	return special.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** Writes rows as CSV, with a header first and lines ending in CRLF. */
export function toCsv(header: string[], rows: (string | number | null)[][]): string {
	return [header, ...rows]
		.map((row) => row.map((value) => field(value === null ? '' : String(value))).join(','))
		.join('\r\n')
		.concat('\r\n');
}

/** Reads CSV text into rows of fields, following quotes across commas and line breaks. */
export function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let value = '';
	let quoted = false;
	const source = text.startsWith('﻿') ? text.slice(1) : text;
	for (let index = 0; index < source.length; index++) {
		const char = source.charAt(index);
		if (quoted) {
			if (char === '"' && source[index + 1] === '"') {
				value += '"';
				index++;
			} else if (char === '"') {
				quoted = false;
			} else {
				value += char;
			}
		} else if (char === '"') {
			quoted = true;
		} else if (char === ',') {
			row.push(value);
			value = '';
		} else if (char === '\n' || char === '\r') {
			if (char === '\r' && source[index + 1] === '\n') index++;
			row.push(value);
			rows.push(row);
			row = [];
			value = '';
		} else {
			value += char;
		}
	}
	if (value !== '' || row.length > 0) {
		row.push(value);
		rows.push(row);
	}
	return rows;
}
