import { expect, test } from '@playwright/test';
import { createAccount, signIn } from './support/accounts';

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

		await expect(popular.getByRole('article')).toHaveCount(2);
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
		const films = page.getByRole('main').getByRole('listitem');
		await expect(films).toHaveCount(2);
		await expect(films.first().getByRole('link')).toHaveAttribute('href', '/film/78');
		await page.getByRole('link', { name: 'Next page' }).click();
		await expect(page).toHaveURL('/lists/official/top-rated?page=2');
		await expect(films).toHaveCount(1);
		await expect(films.first()).toContainText('21');
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
		await page.getByRole('complementary').getByRole('link', { name: 'Lists' }).click();

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
		const films = page.getByRole('main').getByRole('listitem');
		await expect(films).toHaveCount(3);
		await expect(films.nth(1).getByRole('link')).toHaveAttribute('href', '/film/335984');
		await expect(films.nth(2)).toContainText('Unknown at TMDB');
		await expect(page.getByText('List data from MDBList.')).toBeVisible();

		await page.getByRole('link', { name: 'Next page' }).click();
		await expect(page).toHaveURL('/lists/101?page=2');
		await expect(films).toHaveCount(1);
		await page.getByRole('link', { name: 'Previous page' }).click();
		await expect(page).toHaveURL('/lists/101?page=1');
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
		await expect(main.getByRole('listitem').nth(2)).toContainText('3');

		await page.goto('/lists/101?page=2');
		await expect(page.locator('.backdrop img')).toHaveAttribute(
			'src',
			/blade-runner-backdrop\.jpg$/
		);
		await expect(main.getByRole('listitem').first()).toContainText('41');
	});

	test('tells how much of a public list has been watched', async ({ page }) => {
		await page.goto('/lists/102');
		const progress = page.getByRole('complementary');
		await expect(progress).toContainText('0 of 1');
		await expect(progress).toContainText('0%');

		const poster = page.getByRole('main').getByRole('listitem').first().locator('.poster');
		await poster.hover();
		await poster.getByRole('button', { name: 'Watch', exact: true }).click();
		await expect(poster.getByRole('button', { name: 'Watched' })).toBeVisible();
		await page.reload();

		await expect(progress).toContainText('1 of 1');
		await expect(progress).toContainText('100%');
	});

	test('hides the progress of a list too long to check', async ({ page }) => {
		await page.goto('/lists/101');

		await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(3);
		await expect(page.getByText('You’ve watched')).toHaveCount(0);
	});

	test('offers the quick actions on the films of a public list', async ({ page }) => {
		await page.goto('/lists/101');
		const poster = page.getByRole('main').getByRole('listitem').first().locator('.poster');
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

		await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(3);
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
