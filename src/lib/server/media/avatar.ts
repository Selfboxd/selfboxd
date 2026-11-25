import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

/** Largest accepted upload, in bytes. */
export const avatarMaxBytes = 10 * 1024 * 1024;

/** Side of the stored square picture, in pixels. Smaller pictures are not enlarged. */
export const avatarMaxSize = 400;

/** Largest accepted number of pixels in an uploaded picture. */
const maxInputPixels = 50_000_000;

export const avatarContentType = 'image/webp';

export type AvatarError = 'image_invalid' | 'image_too_large';

export type AvatarResult = { ok: true; image: Buffer } | { ok: false; error: AvatarError };

/**
 * Turns an uploaded picture into the stored one: a square WebP of at most
 * `avatarMaxSize` pixels, compressed and without any metadata.
 */
export async function processAvatar(upload: Uint8Array): Promise<AvatarResult> {
	if (upload.byteLength > avatarMaxBytes) return { ok: false, error: 'image_too_large' };
	try {
		const source = sharp(upload, { limitInputPixels: maxInputPixels }).rotate();
		const { width, height } = await source.metadata();
		const side = Math.min(avatarMaxSize, width, height);
		const image = await source
			.resize(side, side, { fit: 'cover' })
			.webp({ quality: 82 })
			.toBuffer();
		return { ok: true, image };
	} catch {
		return { ok: false, error: 'image_invalid' };
	}
}

function avatarFile(directory: string, userId: number): string {
	return join(directory, `${String(userId)}.webp`);
}

export async function saveAvatar(directory: string, userId: number, image: Buffer) {
	await mkdir(directory, { recursive: true });
	await writeFile(avatarFile(directory, userId), image);
}

export async function deleteAvatar(directory: string, userId: number) {
	await rm(avatarFile(directory, userId), { force: true });
}

/** Reads the stored picture of an account, or returns `undefined` when it has none. */
export async function readAvatar(directory: string, userId: number): Promise<Buffer | undefined> {
	try {
		return await readFile(avatarFile(directory, userId));
	} catch {
		return undefined;
	}
}
