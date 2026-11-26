import { deflateRawSync, inflateRawSync } from 'node:zlib';

/** Bounds on what an archive may hold, so that a crafted file cannot exhaust the server. */
export interface ZipLimits {
	files: number;
	/** Size of all the files once uncompressed, in bytes. */
	bytes: number;
}

export type ZipResult = { ok: true; files: Map<string, Uint8Array> } | { ok: false };

const endSignature = 0x06054b50;
const centralSignature = 0x02014b50;
const localSignature = 0x04034b50;
const stored = 0;
const deflated = 8;

function findEnd(view: DataView): number {
	const earliest = Math.max(0, view.byteLength - 22 - 0xffff);
	for (let offset = view.byteLength - 22; offset >= earliest; offset--) {
		if (view.getUint32(offset, true) === endSignature) return offset;
	}
	return -1;
}

/**
 * Reads the files of a ZIP archive. Folders, unsafe names and files beyond the limits make the
 * archive unreadable rather than partly read.
 */
export function readZip(data: Uint8Array, limits: ZipLimits): ZipResult {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const end = findEnd(view);
	if (end < 0) return { ok: false };
	const count = view.getUint16(end + 10, true);
	let offset = view.getUint32(end + 16, true);
	if (count > limits.files) return { ok: false };

	const files = new Map<string, Uint8Array>();
	const decoder = new TextDecoder();
	let total = 0;
	try {
		for (let index = 0; index < count; index++) {
			if (view.getUint32(offset, true) !== centralSignature) return { ok: false };
			const method = view.getUint16(offset + 10, true);
			const compressedSize = view.getUint32(offset + 20, true);
			const size = view.getUint32(offset + 24, true);
			const nameLength = view.getUint16(offset + 28, true);
			const extraLength = view.getUint16(offset + 30, true);
			const commentLength = view.getUint16(offset + 32, true);
			const localOffset = view.getUint32(offset + 42, true);
			const name = decoder.decode(data.subarray(offset + 46, offset + 46 + nameLength));
			offset += 46 + nameLength + extraLength + commentLength;

			if (name.endsWith('/')) continue;
			if (name.startsWith('/') || name.split('/').includes('..') || name.includes('\\')) {
				return { ok: false };
			}
			total += size;
			if (total > limits.bytes) return { ok: false };
			if (view.getUint32(localOffset, true) !== localSignature) return { ok: false };
			const start =
				localOffset +
				30 +
				view.getUint16(localOffset + 26, true) +
				view.getUint16(localOffset + 28, true);
			const raw = data.subarray(start, start + compressedSize);
			if (method === stored) {
				files.set(name, raw);
			} else if (method === deflated) {
				const content = inflateRawSync(raw, { maxOutputLength: size });
				if (content.byteLength !== size) return { ok: false };
				files.set(name, new Uint8Array(content));
			} else {
				return { ok: false };
			}
		}
	} catch {
		return { ok: false };
	}
	return { ok: true, files };
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
	let value = index;
	for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
	return value >>> 0;
});

function crc32(data: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of data) crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

/** Writes files into a ZIP archive, each one compressed. */
export function writeZip(files: { name: string; content: Uint8Array | string }[]): Uint8Array {
	const encoder = new TextEncoder();
	const locals: Uint8Array[] = [];
	const centrals: Uint8Array[] = [];
	let offset = 0;
	for (const file of files) {
		const name = encoder.encode(file.name);
		const content = typeof file.content === 'string' ? encoder.encode(file.content) : file.content;
		const compressed = new Uint8Array(deflateRawSync(content));
		const crc = crc32(content);

		const local = new Uint8Array(30 + name.length);
		const localView = new DataView(local.buffer);
		localView.setUint32(0, localSignature, true);
		localView.setUint16(4, 20, true);
		localView.setUint16(6, 0x0800, true);
		localView.setUint16(8, deflated, true);
		localView.setUint32(14, crc, true);
		localView.setUint32(18, compressed.length, true);
		localView.setUint32(22, content.length, true);
		localView.setUint16(26, name.length, true);
		local.set(name, 30);
		locals.push(local, compressed);

		const central = new Uint8Array(46 + name.length);
		const centralView = new DataView(central.buffer);
		centralView.setUint32(0, centralSignature, true);
		centralView.setUint16(4, 20, true);
		centralView.setUint16(6, 20, true);
		centralView.setUint16(8, 0x0800, true);
		centralView.setUint16(10, deflated, true);
		centralView.setUint32(16, crc, true);
		centralView.setUint32(20, compressed.length, true);
		centralView.setUint32(24, content.length, true);
		centralView.setUint16(28, name.length, true);
		centralView.setUint32(42, offset, true);
		central.set(name, 46);
		centrals.push(central);

		offset += local.length + compressed.length;
	}
	const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
	const end = new Uint8Array(22);
	const endView = new DataView(end.buffer);
	endView.setUint32(0, endSignature, true);
	endView.setUint16(8, files.length, true);
	endView.setUint16(10, files.length, true);
	endView.setUint32(12, centralSize, true);
	endView.setUint32(16, offset, true);

	const parts = [...locals, ...centrals, end];
	const archive = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
	let position = 0;
	for (const part of parts) {
		archive.set(part, position);
		position += part.length;
	}
	return archive;
}
