import { expect, test, type Page } from '@playwright/test';
import { admin, apiSignIn, bearer, createAccount, signIn, chooseOption } from './support/accounts';

function actions(page: Page) {
	return page.getByRole('region', { name: 'Your actions' });
}

function seasons(page: Page) {
	return page.getByRole('main').locator('section.seasons li');
}

test.describe('series catalogue', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	test('opens from the header with the popular series of the week', async ({ page }) => {
		await page.goto('/');
		await page
			.getByRole('navigation', { name: 'Main navigation' })
			.getByRole('link', { name: 'Series', exact: true })
			.click();

		await expect(page).toHaveURL('/series');
		await expect(page.getByRole('heading', { name: 'Popular series this week' })).toBeVisible();
		await expect(page.locator('main a[href="/series/1400"]').first()).toBeVisible();
		await expect(page.locator('main a[href="/series/1401"]').first()).toBeVisible();
	});

	test('browses series by genre', async ({ page }) => {
		await page.goto('/series');
		const bar = page.getByRole('navigation', { name: 'Browse by' });
		await bar.getByRole('button', { name: 'Genre', exact: true }).hover();
		await bar.getByRole('link', { name: 'Crime', exact: true }).click();

		await expect(page).toHaveURL('/series/browse?genre=80');
		await expect(page.locator('main a[href^="/series/14"]')).toHaveCount(1);
		await expect(page.locator('main a[href="/series/1400"]')).toBeVisible();
	});

	test('finds series from the main search', async ({ page }) => {
		await page.goto('/search?q=neon');
		await page.getByRole('complementary').getByRole('link', { name: 'Series' }).click();

		await expect(page).toHaveURL('/search?q=neon&type=series');
		await expect(page.getByRole('link', { name: 'Neon Precinct', exact: true })).toHaveAttribute(
			'href',
			'/series/1400'
		);
	});
});

test.describe('series page', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
		await page.goto('/series/1400');
	});

	test('shows the creators, the state of the series and its seasons', async ({ page }) => {
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Neon Precinct');
		await expect(page.getByText('Created by')).toBeVisible();
		await expect(page.getByText('Ada Rivers')).toBeVisible();
		await expect(page.getByText('Ended', { exact: true })).toBeVisible();
		await expect(page.getByText('Seasons: 2')).toBeVisible();
		await expect(page.getByText('Episodes: 18')).toBeVisible();

		await expect(seasons(page)).toHaveCount(3);
		await expect(seasons(page).nth(0)).toContainText('Season 1');
		await expect(seasons(page).nth(0)).toContainText('2019');
		await expect(seasons(page).nth(0)).not.toContainText('Episodes');
		await expect(seasons(page).nth(2)).toContainText('Specials');
	});

	test('names the networks in the details', async ({ page }) => {
		await page.getByRole('tab', { name: 'Details' }).click();

		await expect(page.getByRole('tabpanel')).toContainText('Night Channel');
		await expect(page.getByRole('tab', { name: 'Releases' })).toHaveCount(0);
	});

	test('logs a season with a status', async ({ page }) => {
		const poster = seasons(page).nth(1).locator('.poster');
		await poster.hover();
		await poster.getByRole('button', { name: 'More actions' }).click();
		await poster.getByRole('button', { name: 'Review or log…' }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByLabel('Season', { exact: true })).toHaveText('Season 2');
		await expect(dialog.getByLabel('Status', { exact: true })).toHaveText('Finished');
		await chooseOption(dialog, 'Status', 'Watching');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toBeHidden();

		await expect(page.locator('#activity')).toContainText('Season 2');
		await expect(page.locator('.sidebar .state')).toHaveText('Watching');
		await expect(actions(page).getByRole('button', { name: 'Logged' })).toBeVisible();
		await expect(actions(page).getByRole('button', { name: 'Add series to lists…' })).toBeVisible();

		await page.goto('/diary');
		const row = page.getByRole('row').filter({ hasText: 'Neon Precinct' });
		await expect(row).toContainText('Season 2');
		await expect(row.getByRole('link', { name: 'Neon Precinct', exact: true })).toHaveAttribute(
			'href',
			'/series/1400'
		);
	});

	test('logs the whole series from the actions', async ({ page }) => {
		await actions(page)
			.getByRole('button', { name: /Review or log/ })
			.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByLabel('Season', { exact: true })).toHaveText('Whole series');
		await expect(dialog.getByLabel('Status', { exact: true })).toHaveText('Finished');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toBeHidden();

		await expect(page.locator('.sidebar .state')).toHaveText('Finished');
	});

	test('refuses a forged season', async ({ page, baseURL }) => {
		const response = await page.request.post('/series/1400?/log', {
			headers: { origin: baseURL ?? '' },
			form: { watchedOn: '2026-01-10', season: 'nine' }
		});

		expect(await response.text()).toContain('season_invalid');
	});

	test('offers the quick actions on the poster of the series', async ({ page }) => {
		const poster = page.locator('aside .poster').first();
		await poster.hover();
		const quick = poster.getByRole('group', { name: 'Neon Precinct', exact: true });

		await quick.getByRole('button', { name: 'Like', exact: true }).click();

		await expect(quick.getByRole('button', { name: 'Liked' })).toBeVisible();
		await page.reload();
		await expect(actions(page).getByRole('button', { name: 'Liked' })).toBeVisible();
	});

	test('answers 404 for an unknown series or an invalid identifier', async ({ page }) => {
		expect((await page.goto('/series/999'))?.status()).toBe(404);
		expect((await page.goto('/series/abc'))?.status()).toBe(404);
	});
});

test.describe('series API', () => {
	test('returns a series', async ({ request }) => {
		const token = await apiSignIn(request, admin);

		const response = await request.get('/api/v1/series/1400', { headers: bearer(token) });

		expect(response.status()).toBe(200);
		expect(await response.json()).toMatchObject({
			series: { id: 1400, title: 'Neon Precinct', seasonCount: 2 }
		});
	});

	test('keeps the state of a series apart from a film', async ({ request }) => {
		const headers = bearer(await apiSignIn(request, await createAccount(request)));

		const changed = await request.patch('/api/v1/series/1400/state', {
			headers,
			data: { liked: true }
		});
		expect(changed.status()).toBe(200);
		expect(await changed.json()).toMatchObject({ state: { liked: true, status: null } });

		const film = await request.get('/api/v1/films/1400/state', { headers });
		expect(await film.json()).toMatchObject({ state: { liked: false } });
	});

	test('answers 404 for an unknown series and requires authentication', async ({ request }) => {
		const headers = bearer(await apiSignIn(request, admin));
		const unknown = await request.patch('/api/v1/series/999/state', {
			headers,
			data: { liked: true }
		});
		expect(unknown.status()).toBe(404);
		expect((await request.get('/api/v1/series/1400/state')).status()).toBe(401);
	});
});
