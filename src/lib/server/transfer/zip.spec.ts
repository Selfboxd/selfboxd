import { describe, expect, it } from 'vitest';
import { readZip, writeZip } from './zip';

const limits = { files: 10, bytes: 1_000_000 };
const text = (data: Uint8Array | undefined) => new TextDecoder().decode(data);

describe('zip', () => {
	it('reads back what it writes', () => {
		const archive = writeZip([
			{ name: 'diary.csv', content: 'Date,Name\r\n2026-01-01,Alien\r\n' },
			{ name: 'lists/top.csv', content: 'x'.repeat(5000) }
		]);
		const read = readZip(archive, limits);
		expect(read.ok).toBe(true);
		if (!read.ok) return;
		expect([...read.files.keys()]).toEqual(['diary.csv', 'lists/top.csv']);
		expect(text(read.files.get('diary.csv'))).toBe('Date,Name\r\n2026-01-01,Alien\r\n');
		expect(read.files.get('lists/top.csv')?.length).toBe(5000);
	});

	it('refuses archives beyond the limits, with unsafe names or that are not archives', () => {
		const big = writeZip([{ name: 'a.csv', content: 'x'.repeat(2000) }]);
		expect(readZip(big, { files: 10, bytes: 1000 }).ok).toBe(false);
		const many = writeZip(
			Array.from({ length: 3 }, (_, index) => ({ name: `${String(index)}.csv`, content: '' }))
		);
		expect(readZip(many, { files: 2, bytes: 1000 }).ok).toBe(false);
		expect(readZip(writeZip([{ name: '../escape.csv', content: '' }]), limits).ok).toBe(false);
		expect(readZip(new TextEncoder().encode('not a zip'), limits).ok).toBe(false);
	});
});
