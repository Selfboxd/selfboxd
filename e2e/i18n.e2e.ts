import { expect, test } from '@playwright/test';

test.describe('interface language', () => {
	test.describe('with a French browser', () => {
		test.use({ locale: 'fr-FR' });

		test('renders the interface in French', async ({ page }) => {
			await page.goto('/');

			await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
			await expect(page.getByRole('contentinfo')).toContainText('affilié');
		});
	});

	test.describe('with an unsupported browser language', () => {
		test.use({ locale: 'fi-FI' });

		test('falls back to English', async ({ page }) => {
			await page.goto('/');

			await expect(page.locator('html')).toHaveAttribute('lang', 'en');
		});
	});
});
