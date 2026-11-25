import { expect, test, type Page } from '@playwright/test';
import { apiSignIn, bearer, createAccount, signIn } from './support/accounts';

/** Hovers the poster of a film on the Films page and returns its quick actions. */
async function hoverPoster(page: Page, title: string) {
	const poster = page.locator('.poster', { has: page.locator(`a[title^="${title} ("]`) }).first();
	await poster.hover();
	const actions = poster.getByRole('group', { name: title, exact: true });
	await expect(actions.getByRole('button', { name: 'More actions' })).toBeEnabled();
	return actions;
}

test.describe('poster quick actions', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
		await page.goto('/films');
	});

	test('marks a film as watched and liked from its poster', async ({ page }) => {
		const actions = await hoverPoster(page, 'Blade Runner 2049');

		await actions.getByRole('button', { name: 'Watch', exact: true }).click();
		await expect(actions.getByRole('button', { name: 'Watched' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await actions.getByRole('button', { name: 'Like', exact: true }).click();
		await expect(actions.getByRole('button', { name: 'Liked' })).toBeVisible();

		await page.goto('/watched');
		await expect(page.locator('a[href="/film/335984"]')).toBeVisible();
		await page.goto('/likes');
		await expect(page.locator('a[href="/film/335984"]')).toBeVisible();
	});

	test('shows the stored state again on another page', async ({ page }) => {
		let actions = await hoverPoster(page, 'Blade Runner 2049');
		await actions.getByRole('button', { name: 'Like', exact: true }).click();
		await expect(actions.getByRole('button', { name: 'Liked' })).toBeVisible();

		await page.goto('/search?q=2049');
		actions = await hoverPoster(page, 'Blade Runner 2049');

		await expect(actions.getByRole('button', { name: 'Liked' })).toBeVisible();
		await expect(actions.getByRole('button', { name: 'Watch', exact: true })).toBeVisible();
	});

	test('rates a film and adds it to the watchlist from the menu', async ({ page }) => {
		const actions = await hoverPoster(page, 'Blade Runner 2049');
		await actions.getByRole('button', { name: 'More actions' }).click();

		await actions.getByRole('button', { name: 'Add to watchlist' }).click();
		await expect(actions.getByRole('button', { name: 'Remove from watchlist' })).toBeVisible();
		await page.goto('/watchlist');
		await expect(page.locator('a[href="/film/335984"]')).toBeVisible();

		await page.goto('/films');
		const again = await hoverPoster(page, 'Blade Runner 2049');
		await again.getByRole('button', { name: 'More actions' }).click();
		await again.getByRole('button', { name: '4 out of 5 stars', exact: true }).click();
		await expect(again.getByRole('button', { name: 'Watched' })).toBeVisible();
		await page.goto('/film/335984');
		await expect(
			page.getByRole('region', { name: 'Your actions' }).getByText('Rated')
		).toBeVisible();
	});

	test('logs a film from the menu', async ({ page }) => {
		const actions = await hoverPoster(page, 'Blade Runner 2049');
		await actions.getByRole('button', { name: 'More actions' }).click();
		await actions.getByRole('button', { name: 'Review or log…' }).click();

		const dialog = page.getByRole('dialog', { name: 'I watched…' });
		await expect(dialog.getByText('Blade Runner 2049')).toBeVisible();
		await dialog.getByLabel('Watched on').fill('2026-05-05');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toBeHidden();

		await page.goto('/diary');
		await expect(page.getByRole('row').filter({ hasText: 'Blade Runner 2049' })).toHaveCount(1);
	});

	test('adds a film to a list from the menu', async ({ page }) => {
		await page.goto('/lists/new');
		await page.getByLabel('Name', { exact: true }).fill('From posters');
		await page.getByRole('main').getByRole('button', { name: 'Save' }).click();
		await expect(page).toHaveURL(/\/lists\/\d+$/);
		const listPath = new URL(page.url()).pathname;
		await page.goto('/films');

		const actions = await hoverPoster(page, 'Blade Runner 2049');
		await actions.getByRole('button', { name: 'More actions' }).click();
		await actions.getByRole('button', { name: 'Add to lists…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Add to lists' });
		await dialog.getByLabel('From posters').check();
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toBeHidden();

		await page.goto(listPath);
		await expect(page.locator('a[href="/film/335984"]')).toBeVisible();
	});

	test('closes the menu on a click outside', async ({ page }) => {
		const actions = await hoverPoster(page, 'Blade Runner 2049');
		await actions.getByRole('button', { name: 'More actions' }).click();
		await expect(actions.getByRole('button', { name: 'Add to lists…' })).toBeVisible();

		await page.getByRole('heading', { level: 1 }).click();

		await expect(actions.getByRole('button', { name: 'Add to lists…' })).toBeHidden();
	});

	test('offers the quick actions on the poster of the film page', async ({ page }) => {
		await page.goto('/film/78');
		const poster = page.locator('aside .poster').first();
		await poster.hover();
		const actions = poster.getByRole('group', { name: 'Blade Runner', exact: true });

		await actions.getByRole('button', { name: 'Like', exact: true }).click();

		await expect(actions.getByRole('button', { name: 'Liked' })).toBeVisible();
	});
});

test.describe('film state API', () => {
	test('requires authentication', async ({ request }) => {
		expect((await request.get('/api/v1/films/78/state')).status()).toBe(401);
		const patch = await request.patch('/api/v1/films/78/state', { data: { liked: true } });
		expect(patch.status()).toBe(401);
	});

	test('reads and changes the state of the account only', async ({ request }) => {
		const mine = bearer(await apiSignIn(request, await createAccount(request)));
		const other = bearer(await apiSignIn(request, await createAccount(request)));

		const changed = await request.patch('/api/v1/films/78/state', {
			headers: mine,
			data: { liked: true, rating: 9, inWatchlist: true }
		});
		expect(changed.status()).toBe(200);
		expect(await changed.json()).toMatchObject({
			state: {
				liked: true,
				rating: 9,
				watched: true,
				inWatchlist: true
			}
		});

		const read = await request.get('/api/v1/films/78/state', { headers: mine });
		expect(await read.json()).toMatchObject({ state: { liked: true, rating: 9 } });
		const foreign = await request.get('/api/v1/films/78/state', { headers: other });
		expect(await foreign.json()).toMatchObject({ state: { liked: false, rating: null } });
	});

	test('refuses invalid changes and unknown films', async ({ request }) => {
		const headers = bearer(await apiSignIn(request, await createAccount(request)));

		for (const data of [{}, { liked: 'yes' }, { rating: 99 }, { rating: 1.5 }, { watched: 1 }]) {
			const response = await request.patch('/api/v1/films/78/state', { headers, data });
			expect(response.status()).toBe(400);
		}
		const missing = await request.patch('/api/v1/films/123456/state', {
			headers,
			data: { liked: true }
		});
		expect(missing.status()).toBe(404);
		expect((await request.get('/api/v1/films/abc/state', { headers })).status()).toBe(404);
	});

	test('keeps a film with diary entries watched', async ({ page, request }) => {
		const account = await createAccount(request);
		await signIn(page, account);
		await page.goto('/film/78');
		await page.getByRole('button', { name: 'Review or log…' }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
		await expect(page.getByRole('dialog')).toBeHidden();

		const response = await request.patch('/api/v1/films/78/state', {
			headers: bearer(await apiSignIn(request, account)),
			data: { watched: false }
		});

		expect(response.status()).toBe(409);
		expect(await response.json()).toMatchObject({ error: 'has_diary_entries' });
	});
});
