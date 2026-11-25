import { expect, test } from '@playwright/test';

test.describe('home page', () => {
	test('shows the application name', async ({ page }) => {
		await page.goto('/');

		await expect(page).toHaveTitle('Selfboxd');
		await expect(page.getByRole('heading', { level: 1, name: 'Selfboxd' })).toBeVisible();
	});

	test('states that the project is not affiliated with Letterboxd', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByRole('contentinfo')).toContainText('not affiliated with Letterboxd');
	});

	test('loads without console errors or blocked resources', async ({ page }) => {
		const errors: string[] = [];
		page.on('console', (message) => {
			if (message.type() === 'error') errors.push(message.text());
		});
		page.on('pageerror', (error) => errors.push(error.message));

		await page.goto('/');
		await page.waitForLoadState('networkidle');

		expect(errors).toEqual([]);
	});
});
