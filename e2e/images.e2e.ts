import { expect, test, type Page } from '@playwright/test';
import { createAccount, signIn } from './support/accounts';

function actions(page: Page) {
	return page.getByRole('region', { name: 'Your actions' });
}

async function choosePoster(page: Page, option: 'first' | 'last') {
	const dialog = page.getByRole('dialog', { name: 'Select your preferred poster' });
	await expect(dialog.getByRole('option')).toHaveCount(2);
	await dialog.getByRole('option')[option]().getByRole('button').click();
	await dialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(dialog).toBeHidden();
}

test.describe('posters and backdrops', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	test('changes the poster of a film everywhere and resets it', async ({ page }) => {
		await page.goto('/film/78');
		await actions(page).getByRole('button', { name: 'Watchlist', exact: true }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Add' }).click();
		await expect(page.getByRole('dialog')).toBeHidden();
		await actions(page).getByRole('button', { name: 'Change poster…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Select your preferred poster' });
		await expect(dialog.getByText('Default')).toBeVisible();
		await expect(dialog.getByText('Blade Runner')).toBeVisible();
		await expect(dialog.getByText('Ridley Scott')).toBeVisible();
		await choosePoster(page, 'last');

		await expect(page.locator('main img[src$="/alternate-poster.jpg"]').first()).toBeVisible();
		await page.goto('/watchlist');
		await expect(page.locator('main a[href="/film/78"] img')).toHaveAttribute(
			'src',
			/alternate-poster\.jpg$/
		);
		await page.goto('/films/browse');
		await expect(page.locator('main a[href="/film/78"] img')).toHaveAttribute(
			'src',
			/alternate-poster\.jpg$/
		);

		await page.goto('/film/78');
		await actions(page).getByRole('button', { name: 'Change poster…' }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Reset poster' }).click();
		await expect(page.getByRole('dialog')).toBeHidden();
		await page.goto('/watchlist');
		await expect(page.locator('main a[href="/film/78"] img')).toHaveAttribute(
			'src',
			/blade-runner-poster\.jpg$/
		);
	});

	test('keeps the poster of each account to itself', async ({ page, browser, request }) => {
		await page.goto('/film/78');
		await actions(page).getByRole('button', { name: 'Change poster…' }).click();
		await choosePoster(page, 'last');

		const other = await browser.newPage();
		await signIn(other, await createAccount(request));
		await other.goto('/films/browse');
		await expect(other.locator('main a[href="/film/78"] img')).toHaveAttribute(
			'src',
			/blade-runner-poster\.jpg$/
		);
		await other.close();
	});

	test('changes the backdrop of a film page', async ({ page }) => {
		await page.goto('/film/78');
		await actions(page).getByRole('button', { name: 'Change backdrop…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Select your preferred backdrop' });
		await dialog.getByRole('option').last().getByRole('button').click();
		await dialog.getByRole('button', { name: 'Save changes' }).click();
		await expect(dialog).toBeHidden();

		await expect(page.locator('.backdrop img')).toHaveAttribute('src', /alternate-backdrop\.jpg$/);
		await page.reload();
		await expect(page.locator('.backdrop img')).toHaveAttribute('src', /alternate-backdrop\.jpg$/);
	});

	test('opens the dialogs from the menu of any poster', async ({ page }) => {
		await page.goto('/films/browse');
		const poster = page.locator('main ul.grid > li').first().locator('.poster');
		await poster.hover();
		await poster.getByRole('button', { name: 'More actions' }).click();
		await poster.getByRole('button', { name: 'Change poster/backdrop…' }).hover();
		await poster.getByRole('button', { name: 'Change backdrop…' }).click();

		await expect(
			page.getByRole('dialog', { name: 'Select your preferred backdrop' })
		).toBeVisible();
	});

	test('refuses a picture TMDB does not offer for the work', async ({ page }) => {
		const response = await page.request.put('/api/v1/films/78/images', {
			data: { poster: '/somewhere-else.jpg' }
		});
		expect(response.status()).toBe(400);

		const banner = await page.request.put('/api/v1/films/78/images', {
			data: { banner: 'https://example.com/x.jpg' }
		});
		expect(banner.status()).toBe(400);
	});
});
