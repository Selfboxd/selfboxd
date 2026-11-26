import { expect, test, type Page } from '@playwright/test';
import { createAccount, signIn } from './support/accounts';
import { stubJournalImages } from './support/journal/images';
import { stubTmdbImages } from './support/tmdb/images';

function collectErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	page.on('pageerror', (error) => errors.push(error.message));
	return errors;
}

test.describe('interface', () => {
	test('greets the signed-in account on the home page', async ({ page, request }) => {
		const account = await createAccount(request);

		await signIn(page, account);

		await expect(page).toHaveTitle('Selfboxd');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			`Welcome back, ${account.username}.`
		);
	});

	test('shows films, series, the watchlist, the diary and the journal on the home page', async ({
		page,
		request
	}) => {
		await stubJournalImages(page);
		await signIn(page, await createAccount(request));
		await page.goto('/film/78');
		await page
			.getByRole('region', { name: 'Your actions' })
			.getByRole('button', { name: 'Watchlist', exact: true })
			.click();
		await page.getByRole('dialog').getByRole('button', { name: 'Add' }).click();
		await expect(page.getByRole('dialog')).toBeHidden();

		await page.goto('/');
		const main = page.getByRole('main');
		await expect(main.getByRole('heading', { name: 'Popular films this week' })).toBeVisible();
		await expect(main.getByRole('heading', { name: 'Popular series this week' })).toBeVisible();
		const watchlist = main.locator('section', {
			has: page.getByRole('heading', { name: 'Still on your watchlist' })
		});
		await expect(watchlist.locator('a[href="/film/78"]').first()).toBeVisible();
		await expect(main.getByText('Log a film to see it here.')).toBeVisible();
		await expect(main.getByRole('heading', { name: 'From the journal' })).toBeVisible();
		await expect(main.getByText('Lead Story', { exact: true })).toBeVisible();
	});

	test('keeps the sign-in page free of any logo, with the favicon only', async ({ page }) => {
		await page.goto('/login');

		await expect(page.getByRole('main').locator('img')).toHaveCount(0);
		await expect(page.locator('link[rel="icon"]')).toHaveAttribute('type', 'image/svg+xml');
	});

	test('states that the project is not affiliated with Letterboxd', async ({ page }) => {
		await page.goto('/login');

		await expect(page.getByRole('contentinfo')).toContainText('not affiliated with Letterboxd');
	});

	test('loads every page without console errors or blocked resources', async ({
		page,
		request
	}) => {
		const errors = collectErrors(page);

		await stubJournalImages(page);
		await stubTmdbImages(page);
		await signIn(page, await createAccount(request));
		for (const path of [
			'/',
			'/settings/auth',
			'/watched',
			'/activity',
			'/diary',
			'/journal',
			'/profile/lists',
			'/profile/lists/new'
		]) {
			await page.goto(path);
			await page.waitForLoadState('networkidle');
		}

		expect(errors).toEqual([]);
	});

	test('shows a not-found page to a signed-in account', async ({ page, request }) => {
		await signIn(page, await createAccount(request));

		const response = await page.goto('/missing-page');

		expect(response?.status()).toBe(404);
		await expect(page.getByText('This page does not exist.')).toBeVisible();
	});
});
