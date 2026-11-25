import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import { createAccount, signIn } from './support/accounts';

async function photo(): Promise<Buffer> {
	return sharp({ create: { width: 900, height: 600, channels: 3, background: '#cc3366' } })
		.jpeg()
		.withExif({ IFD0: { Copyright: 'Ada' }, IFD3: { GPSLatitudeRef: 'N' } })
		.toBuffer();
}

async function upload(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
	await page.goto('/settings/avatar');
	await page.getByLabel('Image').setInputFiles(file);
	await page.getByRole('button', { name: 'Upload' }).click();
}

function headerAvatar(page: Page) {
	return page.getByRole('banner').locator('img.avatar');
}

test.describe('profile picture', () => {
	test('is resized, stripped of metadata and shown in the header', async ({ page, request }) => {
		await signIn(page, await createAccount(request));

		await upload(page, { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: await photo() });

		await expect(page.getByRole('status')).toHaveText('Your avatar has been updated.');
		await expect(headerAvatar(page)).toBeVisible();
		const source = (await headerAvatar(page).getAttribute('src')) ?? '';
		const response = await page.request.get(source);
		expect(response.headers()['content-type']).toBe('image/webp');
		const metadata = await sharp(await response.body()).metadata();
		expect(metadata).toMatchObject({ width: 400, height: 400, format: 'webp' });
		expect(metadata.exif).toBeUndefined();
	});

	test('can be removed', async ({ page, request }) => {
		await signIn(page, await createAccount(request));
		await upload(page, { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: await photo() });
		const source = (await headerAvatar(page).getAttribute('src')) ?? '';

		await page.getByRole('button', { name: 'Remove avatar' }).click();

		await expect(page.getByRole('status')).toHaveText('Your avatar has been removed.');
		await expect(headerAvatar(page)).toBeHidden();
		expect((await page.request.get(source)).status()).toBe(404);
	});

	test('rejects a file that is not an image, whatever its name', async ({ page, request }) => {
		await signIn(page, await createAccount(request));

		await upload(page, {
			name: 'photo.png',
			mimeType: 'image/png',
			buffer: Buffer.from('<svg onload="alert(1)"></svg>')
		});

		await expect(page.getByRole('alert')).toHaveText('This file is not a supported image.');
		await expect(headerAvatar(page)).toBeHidden();
	});

	test('is not served to anonymous visitors', async ({ page, request }) => {
		await signIn(page, await createAccount(request));
		await upload(page, { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: await photo() });
		const source = (await headerAvatar(page).getAttribute('src')) ?? '';

		const response = await request.get(source, { maxRedirects: 0 });

		expect(response.status()).toBe(303);
		expect(response.headers().location).toContain('/login');
	});

	test('rejects identifiers that are not account numbers', async ({ page, request }) => {
		await signIn(page, await createAccount(request));

		for (const id of ['..%2F..%2Fselfboxd.db', 'abc', '1.webp']) {
			expect((await page.request.get(`/avatars/${id}`)).status()).toBe(404);
		}
	});
});
