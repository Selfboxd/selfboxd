import { expect, test, type Page } from '@playwright/test';
import { createAccount, signIn } from './support/accounts';

function navigation(page: Page) {
	return page.getByRole('navigation', { name: 'Main navigation' });
}

function actions(page: Page) {
	return page.getByRole('region', { name: 'Your actions' });
}

test.describe('header', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	test('links to every main page, with the account menu after them', async ({ page }) => {
		const targets = [
			['Activity', '/activity'],
			['Watched', '/watched'],
			['Lists', '/lists'],
			['Diary', '/diary'],
			['Journal', '/journal']
		] as const;

		for (const [name, path] of targets) {
			const link = navigation(page).getByRole('link', { name, exact: true });
			await link.click();
			await expect(page).toHaveURL(path);
			await expect(link).toHaveAttribute('aria-current', 'page');
		}
		await navigation(page).getByRole('link', { name: 'Home', exact: true }).click();
		await expect(page).toHaveURL('/');
	});

	test('opens the account menu on hover and closes it after navigating', async ({ page }) => {
		const settings = navigation(page).getByRole('link', { name: 'Settings' });
		await expect(settings).toBeHidden();

		await navigation(page).getByRole('button', { name: /user/ }).hover();
		await expect(settings).toBeVisible();
		await settings.click();

		await expect(page).toHaveURL('/settings/auth');
		await expect(settings).toBeHidden();
	});

	test('keeps only the search and log controls on the right', async ({ page }) => {
		const account = await navigation(page).getByRole('button', { name: /user/ }).boundingBox();
		const journal = await navigation(page).getByRole('link', { name: 'Journal' }).boundingBox();
		const search = await navigation(page).getByRole('link', { name: 'Search' }).boundingBox();
		const log = await navigation(page)
			.getByRole('button', { name: 'Log', exact: true })
			.boundingBox();

		expect(account?.x).toBeGreaterThan(journal?.x ?? Infinity);
		expect(search?.x).toBeGreaterThan(account?.x ?? Infinity);
		expect(log?.x).toBeGreaterThan(search?.x ?? Infinity);
	});

	test('opens the search field from its icon and closes it with Escape', async ({ page }) => {
		await navigation(page).getByRole('link', { name: 'Search' }).click();
		const field = page.getByRole('searchbox', { name: 'Search' });
		await expect(field).toBeFocused();

		await field.press('Escape');

		await expect(field).toBeHidden();
		await expect(navigation(page).getByRole('link', { name: 'Search' })).toBeVisible();
		await expect(navigation(page).getByRole('button', { name: 'Log', exact: true })).toBeVisible();
	});

	test('replaces the log button with the search field and closes it with its button', async ({
		page
	}) => {
		await navigation(page).getByRole('link', { name: 'Search' }).click();
		await expect(navigation(page).getByRole('button', { name: 'Log', exact: true })).toBeHidden();

		await navigation(page).getByRole('button', { name: 'Close' }).click();

		await expect(page.getByRole('searchbox', { name: 'Search' })).toBeHidden();
	});

	test('logs a film found from the log button, on any page', async ({ page }) => {
		await page.goto('/diary');
		await navigation(page).getByRole('button', { name: 'Log', exact: true }).click();
		const search = page.getByRole('dialog', { name: 'Add to your films…' });
		await search.getByLabel('Name of film').fill('2049');
		await search.getByRole('button', { name: /Blade Runner 2049/ }).click();

		const dialog = page.getByRole('dialog', { name: 'I watched…' });
		await expect(dialog.getByText('Blade Runner 2049')).toBeVisible();
		await dialog.getByLabel('Watched on').fill('2026-04-02');
		await dialog.getByRole('button', { name: '4 out of 5 stars', exact: true }).click();
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toBeHidden();

		const row = page.getByRole('row').filter({ hasText: 'Blade Runner 2049' });
		await expect(row.getByText('Apr 2026')).toBeVisible();
		await expect(row.getByRole('img', { name: '4 out of 5 stars' })).toBeVisible();
	});

	test('reports an invalid entry inside the log dialog', async ({ page }) => {
		await navigation(page).getByRole('button', { name: 'Log', exact: true }).click();
		const search = page.getByRole('dialog', { name: 'Add to your films…' });
		await search.getByLabel('Name of film').fill('2049');
		await search.getByRole('button', { name: /Blade Runner 2049/ }).click();
		const dialog = page.getByRole('dialog', { name: 'I watched…' });

		await dialog.getByLabel('Watched on').fill('2999-01-01');
		await dialog.getByRole('button', { name: 'Save' }).click();

		await expect(dialog.getByRole('alert')).toHaveText(
			'Choose a valid date that is not in the future.'
		);
	});

	test('tells when no film matches in the log search', async ({ page }) => {
		await navigation(page).getByRole('button', { name: 'Log', exact: true }).click();
		const search = page.getByRole('dialog', { name: 'Add to your films…' });

		await search.getByLabel('Name of film').fill('zzzz');

		await expect(search.getByText('No films match this search.')).toBeVisible();
	});
});

test.describe('film page actions', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
		await page.goto('/film/78');
	});

	test('offers to edit the latest entry once the film is logged', async ({ page }) => {
		await actions(page).getByRole('button', { name: 'Review or log…' }).click();
		let dialog = page.getByRole('dialog');
		await dialog.getByLabel('Review').fill('First viewing.');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toBeHidden();

		await expect(actions(page).getByRole('link', { name: 'Show your activity' })).toHaveAttribute(
			'href',
			'#activity'
		);
		await expect(actions(page).getByRole('button', { name: 'Log again…' })).toBeVisible();
		await actions(page).getByRole('button', { name: 'Edit entry or add review…' }).click();

		dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Edit diary entry' })).toBeVisible();
		await expect(dialog.getByLabel('Review')).toHaveValue('First viewing.');
	});

	test('shows the spoiler option only once a review is written', async ({ page }) => {
		await actions(page).getByRole('button', { name: 'Review or log…' }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByLabel('Contains spoilers')).toBeHidden();

		await dialog.getByLabel('Review').fill('He was dead all along.');

		await expect(dialog.getByLabel('Contains spoilers')).toBeVisible();
	});

	test('keeps the poster in view while the page scrolls', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 600 });
		const poster = page.locator('aside img').first();
		await expect(poster).toBeVisible();

		await page.mouse.wheel(0, 600);

		await expect.poll(async () => (await poster.boundingBox())?.y).toBe(16);
	});
});

test.describe('watched films', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	test('is empty for a new account', async ({ page }) => {
		await page.goto('/watched');

		await expect(page.getByText('You have not marked any film as watched yet.')).toBeVisible();
	});

	test('lists watched films with their rating and like, not the others', async ({ page }) => {
		await page.goto('/film/78');
		await actions(page).getByRole('button', { name: '4 out of 5 stars', exact: true }).click();
		await expect(actions(page).getByRole('button', { name: 'Watched' })).toBeVisible();
		await actions(page).getByRole('button', { name: 'Like', exact: true }).click();
		await expect(actions(page).getByRole('button', { name: 'Liked' })).toBeVisible();
		await page.goto('/film/335984');
		await actions(page).getByRole('button', { name: 'Like', exact: true }).click();
		await expect(actions(page).getByRole('button', { name: 'Liked' })).toBeVisible();

		await page.goto('/watched');

		const items = page.getByRole('main').getByRole('listitem');
		await expect(items).toHaveCount(1);
		await expect(items.getByRole('link')).toHaveAttribute('href', '/film/78');
		await expect(items.getByRole('img', { name: '4 out of 5 stars' })).toBeVisible();
		await expect(items.getByRole('img', { name: 'Liked' })).toBeVisible();
	});
});

test.describe('activity', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	test('is empty for a new account', async ({ page }) => {
		await page.goto('/activity');

		await expect(page.getByText('Nothing here yet.')).toBeVisible();
	});

	test('lists what the account did, newest first', async ({ page }) => {
		await page.goto('/film/78');
		await actions(page).getByRole('button', { name: 'Review or log…' }).click();
		const dialog = page.getByRole('dialog');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toBeHidden();
		await page.goto('/film/335984');
		await actions(page).getByRole('button', { name: 'Watchlist', exact: true }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Add' }).click();
		await expect(page.getByRole('dialog')).toBeHidden();

		await page.goto('/activity');

		const items = page.getByRole('main').getByRole('listitem');
		await expect(items).toHaveCount(2);
		await expect(items.nth(0)).toContainText('You added Blade Runner 2049 to your watchlist');
		await expect(items.nth(1)).toContainText('You watched Blade Runner');
		await items.nth(1).getByRole('link', { name: 'Blade Runner', exact: true }).click();
		await expect(page).toHaveURL('/film/78');
	});

	test('does not show the activity of another account', async ({ page, request, browser }) => {
		await page.goto('/film/78');
		await actions(page).getByRole('button', { name: 'Like', exact: true }).click();
		await expect(actions(page).getByRole('button', { name: 'Liked' })).toBeVisible();

		const context = await browser.newContext();
		const other = await context.newPage();
		await signIn(other, await createAccount(request));
		await other.goto('/activity');

		await expect(other.getByText('Nothing here yet.')).toBeVisible();
		await context.close();
	});
});
