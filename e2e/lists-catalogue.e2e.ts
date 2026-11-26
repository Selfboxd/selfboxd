import { expect, test, type Page } from '@playwright/test';
import { createAccount, signIn } from './support/accounts';

/** The films shown by the list page, as a grid or as rows. */
function listEntries(page: Page) {
	return page.locator('main ul.grid > li, main ol.rows > li');
}

test.describe('lists catalogue', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
		await page.goto('/lists');
	});

	test('opens from the header and invites to start a list', async ({ page }) => {
		await page.goto('/');
		await page
			.getByRole('navigation', { name: 'Main navigation' })
			.getByRole('link', { name: 'Lists', exact: true })
			.click();

		await expect(page).toHaveURL('/lists');
		await expect(page.getByRole('heading', { level: 1 })).toContainText(
			'Collect, curate, and share.'
		);
		await page.getByRole('link', { name: 'Start your own list' }).click();
		await expect(page).toHaveURL('/profile/lists/new');
	});

	test('shows featured lists with their owner, size and first posters', async ({ page }) => {
		const featured = page.getByRole('region', { name: 'Featured lists' });
		const card = featured.getByRole('article').filter({ hasText: 'Neon Noir' });

		await expect(featured.getByRole('article')).toHaveCount(3);
		await expect(card).toContainText('curator');
		await expect(card).toContainText('Films: 45');
		await expect(card).toContainText('1.2K');
		await expect(card.locator('img')).toHaveCount(2);
	});

	test('shows the other popular lists after the featured ones', async ({ page }) => {
		const popular = page.getByRole('region', { name: 'Popular lists' });

		await expect(popular.getByRole('article')).toHaveCount(3);
		await expect(popular.getByRole('link', { name: 'Replicants' })).toHaveAttribute(
			'href',
			'/lists/105'
		);
	});

	test('offers the TMDB charts as the official selection', async ({ page }) => {
		const official = page.getByRole('region', { name: 'Official selection' });
		await expect(official.getByRole('article')).toHaveCount(4);
		await expect(official.getByRole('article').first()).toContainText('TMDB');

		await official.getByRole('link', { name: 'Top rated films' }).click();

		await expect(page).toHaveURL('/lists/official/top-rated');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Top rated films');
		await expect(page.locator('.backdrop img')).toHaveAttribute(
			'src',
			/blade-runner-backdrop\.jpg$/
		);
		const films = listEntries(page);
		await expect(films.first().getByRole('link')).toHaveAttribute('href', '/film/78');
		await expect(films).toHaveCount(3);
		await expect(films.nth(2)).toContainText('21');
		await expect(page).toHaveURL('/lists/official/top-rated');
	});

	test('answers 404 for a chart that does not exist', async ({ page }) => {
		expect((await page.goto('/lists/official/nope'))?.status()).toBe(404);
	});

	test('has no search of its own', async ({ page }) => {
		await expect(page.getByRole('main').getByRole('searchbox')).toHaveCount(0);
	});

	test('renders list names as text, never as markup', async ({ page }) => {
		let dialogs = 0;
		page.on('dialog', () => (dialogs += 1));

		await expect(page.getByRole('link', { name: '<img src=x onerror=alert(1)>' })).toBeVisible();
		expect(dialogs).toBe(0);
	});

	test('finds lists by name from the main search', async ({ page }) => {
		await page.goto('/search?q=rainy');
		await page.getByRole('complementary').getByRole('link', { name: 'Public lists' }).click();

		await expect(page).toHaveURL('/search?q=rainy&type=lists');
		await expect(page.getByRole('article')).toHaveCount(1);
		await expect(page.getByRole('link', { name: 'Rainy Cities' })).toHaveAttribute(
			'href',
			'/lists/102'
		);

		await page.goto('/search?q=zzzz&type=lists');
		await expect(page.getByText('No list matches.')).toBeVisible();
	});

	test('opens a public list, pages through it and links its films', async ({ page }) => {
		await page.getByRole('link', { name: 'Neon Noir' }).click();

		await expect(page).toHaveURL('/lists/101');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Neon Noir');
		const films = listEntries(page);
		await expect(films.nth(1).getByRole('link')).toHaveAttribute('href', '/film/335984');
		await expect(films.nth(2)).toContainText('Unknown at TMDB');
		await expect(page.getByText('List data from MDBList.')).toBeVisible();

		await expect(films).toHaveCount(4);
		await expect(films.nth(3).getByRole('link')).toHaveAttribute('href', '/film/9001');
		await expect(page).toHaveURL('/lists/101');
	});

	test('shows the backdrop of the first film, positions and who made the list', async ({
		page
	}) => {
		await page.goto('/lists/101');

		await expect(page.locator('.backdrop img')).toHaveAttribute(
			'src',
			/blade-runner-backdrop\.jpg$/
		);
		const main = page.getByRole('main');
		await expect(main.getByText('List by')).toBeVisible();
		await expect(main.getByText('curator')).toBeVisible();
		await expect(main.getByText('Films: 45')).toBeVisible();
		await expect(listEntries(page).nth(2)).toContainText('3');

		await page.goto('/lists/101?page=2');
		await expect(page.locator('.backdrop img')).toHaveAttribute(
			'src',
			/blade-runner-backdrop\.jpg$/
		);
		await expect(listEntries(page).first()).toContainText('41');
	});

	test('tells how much of a public list has been watched', async ({ page }) => {
		await page.goto('/lists/102');
		const progress = page.getByRole('complementary');
		await expect(progress).toContainText('0 of 1');
		await expect(progress).toContainText('0%');

		const poster = listEntries(page).first().locator('.poster');
		await poster.hover();
		await poster.getByRole('button', { name: 'Watch', exact: true }).click();
		await expect(poster.getByRole('button', { name: 'Watched' })).toBeVisible();
		await page.reload();

		await expect(progress).toContainText('1 of 1');
		await expect(progress).toContainText('100%');
	});

	test('hides the progress of a list too long to check', async ({ page }) => {
		await page.goto('/lists/101');

		await expect(listEntries(page)).toHaveCount(4);
		await expect(page.getByText('You’ve watched')).toHaveCount(0);
	});

	test('offers the quick actions on the films of a public list', async ({ page }) => {
		await page.goto('/lists/101');
		const poster = listEntries(page).first().locator('.poster');
		await poster.hover();

		await poster.getByRole('button', { name: 'Like', exact: true }).click();

		await expect(poster.getByRole('button', { name: 'Liked' })).toBeVisible();
	});

	test('answers 404 for a list that does not exist or an invalid identifier', async ({ page }) => {
		expect((await page.goto('/lists/999'))?.status()).toBe(404);
		expect((await page.goto('/lists/abc'))?.status()).toBe(404);
		expect((await page.goto('/lists/0'))?.status()).toBe(404);
	});

	test('ignores an invalid page number', async ({ page }) => {
		await page.goto('/lists/101?page=-4');

		await expect(listEntries(page).first()).toContainText('1');
		await expect(listEntries(page)).toHaveCount(4);
	});
});

test.describe('list page', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
		await page.goto('/lists/101');
	});

	function bar(page: Page) {
		return page.getByRole('navigation', { name: 'List options' });
	}

	async function choose(page: Page, menu: string | RegExp, entry: string) {
		await bar(page).getByRole('button', { name: menu }).hover();
		await bar(page).getByRole('link', { name: entry, exact: true }).click();
	}

	function titles(page: Page) {
		return listEntries(page).locator('a[title]');
	}

	test('orders the films from the bar of the list', async ({ page }) => {
		await choose(page, /^Sort by/, 'Name');

		await expect(page).toHaveURL('/lists/101?sort=name');
		await expect(titles(page)).toHaveCount(3);
		await expect(titles(page).nth(0)).toHaveAttribute('title', 'Blade Runner (1982)');
		await expect(titles(page).nth(2)).toHaveAttribute('title', 'Unknown at TMDB (1999)');
		await expect(bar(page).getByRole('button', { name: 'Sort by Name' })).toBeVisible();

		await choose(page, /^Sort by/, 'Reverse order');
		await expect(titles(page).nth(0)).toHaveAttribute('title', 'Unknown at TMDB (1999)');
	});

	test('narrows the films by decade and genre', async ({ page }) => {
		await choose(page, 'Decade', '1980s');
		await expect(page).toHaveURL('/lists/101?decade=1980');
		await expect(listEntries(page)).toHaveCount(1);

		await page.goto('/lists/101?genre=Drama');
		await expect(listEntries(page)).toHaveCount(2);
		await choose(page, 'Genre', 'Any genre');
		await expect(listEntries(page)).toHaveCount(4);
	});

	test('hides or keeps only the films already watched', async ({ page }) => {
		await listEntries(page).first().locator('.poster').hover();
		await listEntries(page).first().getByRole('button', { name: 'Watch', exact: true }).click();
		await expect(listEntries(page).first().getByRole('button', { name: 'Watched' })).toBeVisible();

		await choose(page, 'Watched films', 'Hide watched films');
		await expect(listEntries(page)).toHaveCount(2);
		await choose(page, 'Watched films', 'Show only watched films');
		await expect(listEntries(page)).toHaveCount(1);
	});

	test('switches between the grid and the rows', async ({ page }) => {
		await bar(page).getByRole('link', { name: 'List view' }).click();

		await expect(page).toHaveURL('/lists/101?view=detail');
		await expect(page.getByRole('link', { name: 'Blade Runner 2049', exact: true })).toBeVisible();
		await expect(page.locator('main ol.rows > li')).toHaveCount(4);

		await bar(page).getByRole('link', { name: 'Grid view' }).click();
		await expect(page).toHaveURL('/lists/101');
		await expect(page.locator('main ul.grid > li')).toHaveCount(4);
	});

	test('clones a public list into the lists of the account', async ({ page }) => {
		await page.getByRole('complementary').getByRole('button', { name: 'Clone this list' }).click();

		await expect(page).toHaveURL(/\/profile\/lists\/\d+$/);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Neon Noir');
		await expect(listEntries(page)).toHaveCount(3);
		await expect(
			page.getByRole('complementary').getByRole('link', { name: 'Edit or delete this list…' })
		).toBeVisible();
	});

	test('adds every film of a list to the watchlist', async ({ page }) => {
		const side = page.getByRole('complementary');
		await side.getByRole('button', { name: 'Add all films to watchlist' }).click();
		await expect(page.getByRole('status')).toHaveText('The films are on your watchlist.');

		await page.goto('/watchlist');
		await expect(page.locator('main a[href="/film/78"]').first()).toBeVisible();
		await expect(page.locator('main a[href="/film/335984"]').first()).toBeVisible();
	});

	test('shows the series of a public list with the films, in the order of the list', async ({
		page
	}) => {
		await page.goto('/lists/106');

		await expect(listEntries(page)).toHaveCount(2);
		await expect(listEntries(page).nth(0).locator('a[title]')).toHaveAttribute(
			'href',
			'/series/1400'
		);
		await expect(listEntries(page).nth(1).locator('a[title]')).toHaveAttribute('href', '/film/78');
	});

	test('likes a list, which then shows among the likes of the account', async ({ page }) => {
		const side = page.getByRole('complementary');
		await side.getByRole('button', { name: 'Like this list' }).click();
		await expect(side.getByRole('button', { name: 'You liked this list' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);

		await page.goto('/likes');
		const lists = page.getByRole('region', { name: 'Lists' });
		await expect(lists.getByRole('link', { name: 'Neon Noir' })).toHaveAttribute(
			'href',
			'/lists/101'
		);

		await page.goto('/lists/101');
		await side.getByRole('button', { name: 'You liked this list' }).click();
		await expect(side.getByRole('button', { name: 'Like this list' })).toBeVisible();
		await page.goto('/likes');
		await expect(page.getByText('You have not liked a list yet.')).toBeVisible();
	});

	test('offers the same panel on an official chart', async ({ page }) => {
		await page.goto('/lists/official/popular');
		await page.getByRole('complementary').getByRole('button', { name: 'Clone this list' }).click();

		await expect(page).toHaveURL(/\/profile\/lists\/\d+$/);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Popular films');
		await expect(listEntries(page)).toHaveCount(3);
	});
});

test.describe('lists catalogue access', () => {
	test('requires an account', async ({ page }) => {
		await page.goto('/lists');
		await expect(page).toHaveURL(/\/login/);

		await page.goto('/lists/101');
		await expect(page).toHaveURL(/\/login/);
	});
});
