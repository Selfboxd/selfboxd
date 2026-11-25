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

	test('shows popular public lists with their owner, size and first posters', async ({ page }) => {
		const card = page.getByRole('article').filter({ hasText: 'Neon Noir' });

		await expect(page.getByRole('heading', { name: 'Popular lists' })).toBeVisible();
		await expect(page.getByRole('article')).toHaveCount(3);
		await expect(card).toContainText('curator');
		await expect(card).toContainText('Films: 45');
		await expect(card).toContainText('1.2K');
		await expect(card.locator('img')).toHaveCount(2);
	});

	test('renders list names as text, never as markup', async ({ page }) => {
		let dialogs = 0;
		page.on('dialog', () => (dialogs += 1));

		await expect(page.getByRole('link', { name: '<img src=x onerror=alert(1)>' })).toBeVisible();
		expect(dialogs).toBe(0);
	});

	test('finds lists by name', async ({ page }) => {
		await page.getByLabel('Find a list').fill('rainy');
		await page.getByLabel('Find a list').press('Enter');

		await expect(page).toHaveURL('/lists?q=rainy');
		await expect(page.getByRole('heading', { name: 'Lists matching “rainy”' })).toBeVisible();
		await expect(page.getByRole('article')).toHaveCount(1);

		await page.goto('/lists?q=zzzz');
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

	test('offers the quick actions on the films of a public list', async ({ page }) => {
		await page.goto('/lists/101');
		const poster = page.locator('.poster').first();
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
