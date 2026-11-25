import { expect, test, type Page } from '@playwright/test';
import { createAccount, signIn } from './support/accounts';
import { stubJournalImages } from './support/journal/images';

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

	test('shows the logo on the sign-in page and as the favicon', async ({ page }) => {
		await page.goto('/login');

		const logo = page.getByRole('main').locator('img').first();
		await expect(logo).toBeVisible();
		expect(await logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
		await expect(page.locator('link[rel="icon"]')).toHaveAttribute('type', 'image/svg+xml');
	});

	test('opens the account menu from the header', async ({ page, request }) => {
		const account = await createAccount(request);
		await signIn(page, account);
		const navigation = page.getByRole('navigation', { name: 'Main navigation' });

		await expect(navigation.getByRole('link', { name: 'Settings' })).toBeHidden();
		await navigation.getByText(account.username).click();
		await navigation.getByRole('link', { name: 'Settings' }).click();

		await expect(page).toHaveURL('/settings/auth');
		await expect(navigation.getByRole('link', { name: 'Settings' })).toBeHidden();
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
		await signIn(page, await createAccount(request));
		for (const path of ['/', '/settings/auth', '/watched', '/activity', '/diary', '/journal']) {
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
