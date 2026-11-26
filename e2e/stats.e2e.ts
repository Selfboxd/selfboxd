import { expect, test, type Page } from '@playwright/test';
import { createAccount, signIn } from './support/accounts';

async function logFilm(page: Page, watchedOn: string, stars: string) {
	await page.goto('/film/78');
	await page
		.getByRole('region', { name: 'Your actions' })
		.getByRole('button', { name: /Review or log|Log again/ })
		.click();
	const dialog = page.getByRole('dialog');
	await dialog.locator('input[name="watchedOn"]').evaluate((input: HTMLInputElement, value) => {
		input.value = value;
	}, watchedOn);
	await dialog.getByRole('button', { name: stars, exact: true }).click();
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dialog).toBeHidden();
}

test.describe('stats', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	test('sum up the library from the profile tab', async ({ page }) => {
		await logFilm(page, '2025-03-14', '4 out of 5 stars');
		await logFilm(page, '2026-01-02', '5 out of 5 stars');

		await page.goto('/profile');
		await page.getByRole('link', { name: 'Stats', exact: true }).click();
		await expect(page).toHaveURL('/stats');
		const main = page.getByRole('main');
		await expect(main.getByText('Ridley Scott')).toBeVisible({ timeout: 15_000 });
		await expect(main.getByText('Harrison Ford')).toBeVisible();
		await expect(main.getByText('The Ladd Company')).toBeVisible();
		await expect(main.getByRole('list', { name: 'Genres' })).toContainText('Science Fiction');

		const periods = main.getByRole('navigation', { name: 'Period' });
		const kinds = main.getByRole('navigation', { name: 'What to count' });
		await periods.getByRole('link', { name: '2025', exact: true }).click();
		await expect(page).toHaveURL('/stats?year=2025');
		await expect(periods.getByRole('link', { name: '2025', exact: true })).toHaveAttribute(
			'aria-current',
			'page'
		);

		await kinds.getByRole('link', { name: 'Series', exact: true }).click();
		await expect(page).toHaveURL('/stats?year=2025&kind=series');
		await expect(main.getByText('Ridley Scott')).toHaveCount(0);
	});

	test('ignore a year or kind it does not know', async ({ page }) => {
		await logFilm(page, '2025-03-14', '4 out of 5 stars');
		await page.goto('/stats?year=1900&kind=books');
		const main = page.getByRole('main');
		await expect(
			main.getByRole('navigation', { name: 'Period' }).getByRole('link', { name: 'All time' })
		).toHaveAttribute('aria-current', 'page');
		await expect(
			main
				.getByRole('navigation', { name: 'What to count' })
				.getByRole('link', { name: 'All', exact: true })
		).toHaveAttribute('aria-current', 'page');
	});

	test('say when there is nothing to count yet', async ({ page }) => {
		await page.goto('/stats');
		await expect(
			page.getByRole('main').getByText('Nothing watched for this period yet.')
		).toBeVisible();
	});
});
