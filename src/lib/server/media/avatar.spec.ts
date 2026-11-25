import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { deleteAvatar, processAvatar, readAvatar, saveAvatar } from './avatar';

function picture(width: number, height: number) {
	return sharp({ create: { width, height, channels: 3, background: '#3366cc' } });
}

async function processed(upload: Buffer): Promise<Buffer> {
	const result = await processAvatar(upload);
	if (!result.ok) throw new Error(result.error);
	return result.image;
}

describe('processAvatar', () => {
	it('crops a large picture to a 400 pixel square', async () => {
		const image = await processed(await picture(1600, 900).jpeg().toBuffer());

		expect(await sharp(image).metadata()).toMatchObject({
			width: 400,
			height: 400,
			format: 'webp'
		});
	});

	it('does not enlarge a small picture', async () => {
		const image = await processed(await picture(120, 200).png().toBuffer());

		expect(await sharp(image).metadata()).toMatchObject({ width: 120, height: 120 });
	});

	it('removes every metadata block, including the location', async () => {
		const upload = await picture(800, 800)
			.jpeg()
			.withExif({ IFD0: { Copyright: 'Ada' }, IFD3: { GPSLatitudeRef: 'N' } })
			.withIccProfile('p3')
			.toBuffer();
		expect((await sharp(upload).metadata()).exif).toBeDefined();

		const metadata = await sharp(await processed(upload)).metadata();

		expect(metadata.exif).toBeUndefined();
		expect(metadata.icc).toBeUndefined();
		expect(metadata.xmp).toBeUndefined();
	});

	it('applies the orientation before dropping it', async () => {
		const upload = await picture(600, 300).jpeg().withMetadata({ orientation: 6 }).toBuffer();

		const metadata = await sharp(await processed(upload)).metadata();

		expect(metadata).toMatchObject({ width: 300, height: 300 });
		expect(metadata.orientation).toBeUndefined();
	});

	it('rejects a file that is not an image', async () => {
		expect(await processAvatar(Buffer.from('<script>alert(1)</script>'))).toEqual({
			ok: false,
			error: 'image_invalid'
		});
	});

	it('rejects an oversized upload', async () => {
		expect(await processAvatar(Buffer.alloc(10 * 1024 * 1024 + 1))).toEqual({
			ok: false,
			error: 'image_too_large'
		});
	});
});

describe('avatar storage', () => {
	let directory: string;

	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), 'selfboxd-avatars-'));
	});

	afterEach(() => {
		rmSync(directory, { recursive: true, force: true });
	});

	it('stores, reads and deletes the picture of an account', async () => {
		const image = Buffer.from('picture');

		await saveAvatar(join(directory, 'avatars'), 7, image);
		expect(await readAvatar(join(directory, 'avatars'), 7)).toEqual(image);

		await deleteAvatar(join(directory, 'avatars'), 7);
		expect(await readAvatar(join(directory, 'avatars'), 7)).toBeUndefined();
	});

	it('returns nothing for an account without picture', async () => {
		expect(await readAvatar(directory, 7)).toBeUndefined();
	});
});
