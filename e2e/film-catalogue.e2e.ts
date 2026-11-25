import { expect, test, type Page } from '@playwright/test';
import { createAccount, signIn } from './support/accounts';

function browseBar(page: Page) {
	return page.getByRole('navigation', { name: 'Browse by' });
}

async function choose(page: Page, menu: string, entry: string) {
	await browseBar(page).getByRole('button', { name: menu, exact: true }).hover();
	await browseBar(page).getByRole('link', { name: entry, exact: true }).click();
}

test.describe('film catalogue', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
		await page.goto('/films');
	});

	test('shows popular, highest rated and upcoming films', async ({ page }) => {
		for (const name of ['Popular films this week', 'Highest rated', 'Upcoming']) {
			await expect(page.getByRole('heading', { name })).toBeVisible();
		}
		await expect(page.locator('a[href="/film/78"]').first()).toBeVisible();
		const upcoming = page.locator('section', { hasText: 'Upcoming' }).last();
		await expect(upcoming.getByRole('listitem')).toHaveCount(1);
		await expect(upcoming.locator('a[href="/film/9100"]')).toBeVisible();
	});

	test('finds a film by its title', async ({ page }) => {
		await page.getByLabel('Find a film').fill('2049');
		await page.getByLabel('Find a film').press('Enter');

		await expect(page).toHaveURL('/search?q=2049');
		await expect(page.getByRole('link', { name: 'Blade Runner 2049', exact: true })).toBeVisible();
	});

	test('browses a decade', async ({ page }) => {
		await choose(page, 'Year', '1980s');

		await expect(page).toHaveURL('/films/browse?decade=1980');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Films');
		await expect(page.getByText('There are 1 films released in the 1980s.')).toBeVisible();
		await expect(page.locator('a[href="/film/78"]')).toBeVisible();
		await expect(page.locator('a[href="/film/335984"]')).toHaveCount(0);
	});

	test('narrows a decade to one of its years from the strip of years', async ({ page }) => {
		await page.goto('/films/browse?decade=1980');
		const years = page.getByRole('navigation', { name: 'Year' });
		await expect(years.getByRole('link', { name: '1980s' })).toHaveAttribute(
			'aria-current',
			'page'
		);

		await years.getByRole('link', { name: '1982', exact: true }).click();

		await expect(page).toHaveURL('/films/browse?year=1982');
		await expect(years.getByRole('link', { name: '1982', exact: true })).toHaveAttribute(
			'aria-current',
			'page'
		);
		await expect(page.getByText('There are 1 films released in 1982.')).toBeVisible();
		await years.getByRole('link', { name: '1990s' }).click();
		await expect(page).toHaveURL('/films/browse?decade=1990');
	});

	test('changes the filters from the small menus of the results', async ({ page }) => {
		await page.goto('/films/browse');
		const head = page.getByRole('main').locator('header');
		await expect(page.getByText('There are 3 films.')).toBeVisible();

		await head.getByRole('button', { name: 'Genre', exact: true }).hover();
		await head.getByRole('link', { name: 'Science Fiction', exact: true }).click();

		await expect(page).toHaveURL('/films/browse?genre=878');
		await expect(page.getByText('There are 41 films in Science Fiction.')).toBeVisible();
		await expect(head.getByRole('button', { name: 'Science Fiction', exact: true })).toBeVisible();
		await head.getByRole('button', { name: /^Sort by/ }).hover();
		await head.getByRole('link', { name: 'Highest rated', exact: true }).click();
		await expect(page).toHaveURL('/films/browse?sort=rating&genre=878');
	});

	test('combines a genre with an order and keeps them across pages', async ({ page }) => {
		await choose(page, 'Genre', 'Science Fiction');
		await expect(page).toHaveURL('/films/browse?genre=878');
		const head = page.getByRole('main').locator('header');
		await head.getByRole('button', { name: /^Sort by/ }).hover();
		await head.getByRole('link', { name: 'Lowest rated', exact: true }).click();
		await expect(page).toHaveURL('/films/browse?sort=rating_lowest&genre=878');
		const posters = page.locator('main ul.grid a[title]');
		await expect(posters.first()).toHaveAttribute('href', '/film/335984');

		await page.getByRole('link', { name: 'Next page' }).click();
		await expect(page).toHaveURL('/films/browse?sort=rating_lowest&genre=878&page=2');
		await page.getByRole('link', { name: 'Previous page' }).click();
		await expect(page).toHaveURL('/films/browse?sort=rating_lowest&genre=878');
	});

	test('opens one menu at a time and closes it when the pointer leaves', async ({ page }) => {
		await browseBar(page).getByRole('button', { name: 'Year', exact: true }).hover();
		await expect(browseBar(page).getByRole('link', { name: '1980s' })).toBeVisible();

		await browseBar(page).getByRole('button', { name: 'Genre', exact: true }).hover();
		await expect(browseBar(page).getByRole('link', { name: '1980s' })).toBeHidden();
		await expect(browseBar(page).getByRole('link', { name: 'Drama' })).toBeVisible();

		await page.getByRole('heading', { name: 'Highest rated' }).hover();
		await expect(browseBar(page).getByRole('link', { name: 'Drama' })).toBeHidden();
	});

	test('ignores filters that are not valid', async ({ page }) => {
		await page.goto('/films/browse?sort=%3Cscript%3E&decade=1985&genre=999999&page=-3');

		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Films');
		await expect(page.getByRole('button', { name: 'Sort by Popularity' })).toBeVisible();
		await expect(page.locator('a[href="/film/78"]')).toBeVisible();
	});

	test('tells when no film matches', async ({ page }) => {
		await page.goto('/films/browse?decade=1900');

		await expect(page.getByText('No films match these filters.')).toBeVisible();
	});
});
