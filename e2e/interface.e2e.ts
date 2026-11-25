import { expect, test, type Page } from '@playwright/test';
import { createAccount, signIn } from './support/accounts';

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

	test('states that the project is not affiliated with Letterboxd', async ({ page }) => {
		await page.goto('/login');

		await expect(page.getByRole('contentinfo')).toContainText('not affiliated with Letterboxd');
	});

	test('loads every page without console errors or blocked resources', async ({
		page,
		request
	}) => {
		const errors = collectErrors(page);

		await signIn(page, await createAccount(request));
		for (const path of ['/', '/settings/auth']) {
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
