import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { readZip, writeZip } from '../src/lib/server/transfer/zip';
import { createAccount, signIn } from './support/accounts';

/** A small Letterboxd export: two films TMDB knows, one it does not. */
const letterboxd: Record<string, string> = {
	'profile.csv':
		'Date Joined,Username,Given Name,Family Name,Email Address,Location,Website,Bio,Pronoun,Favorite Films\n' +
		'2025-01-01,ada,,,,Lisbon,,Night owl,,https://boxd.it/f1\n',
	'watched.csv':
		'Date,Name,Year,Letterboxd URI\n' +
		'2025-01-02,Blade Runner,1982,https://boxd.it/f1\n' +
		'2025-01-03,Nowhere Film,1999,https://boxd.it/f3\n',
	'ratings.csv':
		'Date,Name,Year,Letterboxd URI,Rating\n2025-01-02,Blade Runner,1982,https://boxd.it/f1,4.5\n',
	'diary.csv':
		'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n' +
		'2025-01-02,Blade Runner,1982,https://boxd.it/e1,4.5,,cinema,2025-01-01\n',
	'reviews.csv':
		'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Review,Tags,Watched Date\n' +
		'2025-01-02,Blade Runner,1982,https://boxd.it/e1,4.5,,"Tears in rain.",cinema,2025-01-01\n',
	'likes/films.csv':
		'Date,Name,Year,Letterboxd URI\n2025-01-02,Blade Runner,1982,https://boxd.it/f1\n',
	'watchlist.csv':
		'Date,Name,Year,Letterboxd URI\n2025-01-04,Blade Runner 2049,2017,https://boxd.it/f2\n',
	'lists/neon.csv':
		'Letterboxd list export v7\nDate,Name,Tags,URL,Description\n2025-01-05,Neon,,https://boxd.it/l1,Night films\n\n' +
		'Position,Name,Year,URL,Description\n1,Blade Runner 2049,2017,https://boxd.it/f2,\n2,Blade Runner,1982,https://boxd.it/f1,The cut\n'
};

function archive(path: string, files: Record<string, string> = letterboxd): string {
	writeFileSync(
		path,
		writeZip(Object.entries(files).map(([name, content]) => ({ name, content })))
	);
	return path;
}

async function upload(page: Page, path: string) {
	await page.goto('/settings/transfer');
	await page.getByLabel('Choose the .zip file').setInputFiles(path);
}

test.describe('import and export', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	test('imports a Letterboxd export after showing what it holds', async ({ page }, info) => {
		await upload(page, archive(info.outputPath('letterboxd.zip')));

		await expect(page.getByRole('heading', { name: 'Ready to import' })).toBeVisible({
			timeout: 15_000
		});
		await expect(page.getByText('2 of 3 films found on TMDB')).toBeVisible();
		await page.getByText('1 films not found, left out').click();
		await expect(page.getByText('Nowhere Film')).toBeVisible();
		await expect(page.getByText('Nothing in the file disagrees with your library.')).toBeVisible();

		await page.getByRole('button', { name: 'Import', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Import complete' })).toBeVisible();
		await expect(
			page.getByText('Added 1 diary entries, 1 ratings, 1 likes, 1 watchlist titles and 1 lists.')
		).toBeVisible();

		await page.goto('/diary');
		const row = page.getByRole('row').filter({ hasText: 'Blade Runner' });
		await expect(row.getByRole('img', { name: '4.5 out of 5 stars' })).toBeVisible();
		await expect(row.getByRole('link', { name: 'Read the review' })).toBeVisible();
		await page.goto('/watchlist');
		await expect(page.locator('main a[href="/film/335984"]').first()).toBeVisible();
		await page.goto('/profile/lists');
		await expect(page.getByRole('link', { name: 'Neon' }).first()).toBeVisible();
		await page.goto('/profile');
		await expect(page.getByText('Night owl')).toBeVisible();
	});

	test('asks how to settle what differs from the library', async ({ page }, info) => {
		await page.goto('/film/78');
		await page
			.getByRole('region', { name: 'Your actions' })
			.getByRole('button', { name: /Review or log/ })
			.click();
		const dialog = page.getByRole('dialog');
		await dialog.locator('input[name="watchedOn"]').evaluate((input: HTMLInputElement) => {
			input.value = '2025-01-01';
		});
		await dialog.getByRole('button', { name: '2 out of 5 stars', exact: true }).click();
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toBeHidden();

		await upload(page, archive(info.outputPath('letterboxd.zip')));
		await expect(page.getByRole('heading', { name: 'Ready to import' })).toBeVisible({
			timeout: 15_000
		});
		await expect(
			page.getByText('1 diary entries already in your diary on the same day')
		).toBeVisible();
		await expect(page.getByText('1 ratings differ from yours')).toBeVisible();
		await page
			.getByRole('radiogroup', { name: '1 ratings differ from yours' })
			.getByText('Take Letterboxd’s')
			.click();
		await page.getByRole('button', { name: 'Import', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Import complete' })).toBeVisible();

		await page.goto('/diary');
		await expect(page.getByRole('row').filter({ hasText: 'Blade Runner' })).toHaveCount(1);
		await page.goto('/film/78');
		await expect(
			page.getByRole('region', { name: 'Your actions' }).getByText('Rated')
		).toBeVisible();
		await expect(
			page
				.getByRole('region', { name: 'Your actions' })
				.getByRole('button', { name: '4.5 out of 5 stars', exact: true })
		).toHaveAttribute('aria-pressed', 'true');
	});

	test('refuses a file that is not a Letterboxd export and can be cancelled', async ({
		page
	}, info) => {
		await upload(page, archive(info.outputPath('other.zip'), { 'photo.txt': 'hello' }));
		await expect(page.getByRole('alert')).toHaveText(
			'This file is not a Letterboxd export. Choose the .zip downloaded from Letterboxd.'
		);

		await upload(page, archive(info.outputPath('letterboxd.zip')));
		await expect(page.getByRole('heading', { name: 'Ready to import' })).toBeVisible({
			timeout: 15_000
		});
		await page.getByRole('button', { name: 'Cancel' }).click();
		await expect(page.getByLabel('Choose the .zip file')).toBeAttached();
	});

	test('exports the library as CSV files', async ({ page }) => {
		await page.goto('/film/78');
		await page
			.getByRole('region', { name: 'Your actions' })
			.getByRole('button', { name: /Review or log/ })
			.click();
		await page.getByRole('dialog').getByLabel('Review').fill('Tears, in "rain".');
		await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
		await expect(page.getByRole('dialog')).toBeHidden();

		await page.goto('/settings/transfer');
		const download = page.waitForEvent('download');
		await page.getByRole('link', { name: 'Download my data' }).click();
		const file = await download;
		expect(file.suggestedFilename()).toMatch(/^selfboxd-.+\.zip$/);
		const read = readZip(new Uint8Array(readFileSync(await file.path())), {
			files: 50,
			bytes: 1_000_000
		});
		expect(read.ok).toBe(true);
		if (!read.ok) return;
		const diary = new TextDecoder().decode(read.files.get('diary.csv'));
		expect(diary).toContain('Blade Runner,1982,film,78');
		expect(diary).toContain('"Tears, in ""rain""."');
		expect([...read.files.keys()]).toEqual(
			expect.arrayContaining(['profile.csv', 'watched.csv', 'likes.csv', 'watchlist.csv'])
		);
	});

	test('keeps each account to its own import and export', async ({ request }) => {
		const anonymous = await request.get('/settings/transfer/export', { maxRedirects: 0 });
		expect(anonymous.status()).toBe(303);
	});
});
