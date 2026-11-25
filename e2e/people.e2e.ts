import { expect, test, type Page } from '@playwright/test';
import { createAccount, signIn } from './support/accounts';

function posters(page: Page) {
	return page.locator('main ul.grid a[title]');
}

function roles(page: Page) {
	return page.getByRole('navigation', { name: 'Roles' });
}

async function choose(page: Page, menu: string, option: string) {
	const trigger = page.getByRole('main').getByRole('button', { name: menu, exact: true });
	await trigger.hover();
	await trigger.locator('xpath=..').getByRole('link', { name: option, exact: true }).click();
}

test.describe('person pages', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	test('open from the director of a film on the role they are known for', async ({ page }) => {
		await page.goto('/film/78');
		await page.getByRole('link', { name: 'Ridley Scott' }).first().click();

		await expect(page).toHaveURL('/person/578');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Directed by');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Ridley Scott');
		await expect(roles(page).getByRole('link', { name: 'Director 2' })).toHaveAttribute(
			'aria-current',
			'page'
		);
		await expect(posters(page).nth(0)).toHaveAttribute('href', '/film/335984');
		await expect(posters(page).nth(1)).toHaveAttribute('href', '/film/78');
	});

	test('show one tab per role, without talk shows', async ({ page }) => {
		await page.goto('/person/578');
		await expect(roles(page).getByRole('link')).toHaveText([
			'Actor 1',
			'Director 2',
			'Producer 1',
			'Executive producer 1'
		]);

		await roles(page).getByRole('link', { name: 'Actor 1' }).click();

		await expect(page).toHaveURL('/person/578?role=actor');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Starring');
		await expect(posters(page)).toHaveCount(1);
		await expect(posters(page).first()).toHaveAttribute('href', '/series/1401');

		await roles(page).getByRole('link', { name: 'Executive producer 1' }).click();
		await expect(posters(page).first()).toHaveAttribute('href', '/series/1400');
	});

	test('sort and narrow the works of a role', async ({ page }) => {
		await page.goto('/person/578');

		await choose(page, 'Sort by Popularity', 'Earliest first');
		await expect(page).toHaveURL('/person/578?sort=oldest');
		await expect(posters(page).nth(0)).toHaveAttribute('href', '/film/78');

		await choose(page, 'Decade', '2010s');
		await expect(page).toHaveURL('/person/578?decade=2010&sort=oldest');
		await expect(posters(page)).toHaveCount(1);
		await expect(posters(page).first()).toHaveAttribute('href', '/film/335984');

		await choose(page, 'Type', 'Series');
		await expect(page.getByText('No work matches these filters.')).toBeVisible();
	});

	test('show the biography, birth and a link to TMDB', async ({ page }) => {
		await page.goto('/person/578');
		const side = page.getByRole('complementary');

		await expect(side.getByText('South Shields, England')).toBeVisible();
		await expect(side.getByText('An English film director.')).toBeVisible();
		await expect(side.getByText('He made Alien and Blade Runner.')).toHaveCount(0);
		await side.getByRole('button', { name: 'More' }).click();
		await expect(side.getByText('He made Alien and Blade Runner.')).toBeVisible();
		await expect(side.getByRole('link', { name: 'More at TMDB' })).toHaveAttribute(
			'href',
			'https://www.themoviedb.org/person/578'
		);
	});

	test('link the cast, the crew and the creators of a series', async ({ page }) => {
		await page.goto('/film/78');
		await expect(
			page.getByRole('tabpanel').getByRole('link', { name: 'Harrison Ford' })
		).toHaveAttribute('href', '/person/3');
		await page.getByRole('tab', { name: 'Crew' }).click();
		await expect(
			page.getByRole('tabpanel').getByRole('link', { name: 'Hampton Fancher' })
		).toHaveAttribute('href', '/person/583');

		await page.goto('/series/1400');
		await expect(page.getByRole('link', { name: 'Ada Rivers' }).first()).toHaveAttribute(
			'href',
			'/person/501'
		);
	});

	test('are found from the main search', async ({ page }) => {
		await page.goto('/search?q=ridley');
		const results = page.locator('main ul.results > li');
		await expect(results).toHaveCount(1);
		await expect(results.first()).toContainText('Director');
		await expect(results.first()).toContainText('Known for Blade Runner, Blade Runner 2049');

		await page.getByRole('complementary').getByRole('link', { name: 'Cast, crew or team' }).click();
		await expect(page).toHaveURL('/search?q=ridley&type=people');
		await results.first().getByRole('link', { name: 'Ridley Scott' }).click();
		await expect(page).toHaveURL('/person/578');
	});

	test('answer not found for an unknown person', async ({ page }) => {
		const response = await page.goto('/person/424242');
		expect(response?.status()).toBe(404);
	});
});

test.describe('studio and network pages', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	test('open a studio from the details of a film with its films and series', async ({ page }) => {
		await page.goto('/film/78');
		await page.getByRole('tab', { name: 'Details' }).click();
		await page.getByRole('link', { name: 'Warner Bros. Pictures' }).click();

		await expect(page).toHaveURL('/studio/174');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Studio');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Warner Bros. Pictures');
		await expect(posters(page)).toHaveCount(1);
		await expect(posters(page).first()).toHaveAttribute('href', '/film/78');

		await page.getByRole('link', { name: 'Series', exact: true }).last().click();
		await expect(page).toHaveURL('/studio/174?kind=series');
		await expect(posters(page)).toHaveCount(1);
		await expect(posters(page).first()).toHaveAttribute('href', '/series/1400');

		await choose(page, 'Sort by Popularity', 'Name');
		await expect(page).toHaveURL('/studio/174?kind=series&sort=name');
	});

	test('open a network from a series', async ({ page }) => {
		await page.goto('/series/1400');
		await page.getByRole('link', { name: 'Night Channel' }).first().click();

		await expect(page).toHaveURL('/network/49');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Night Channel');
		await expect(posters(page)).toHaveCount(2);
	});
});
