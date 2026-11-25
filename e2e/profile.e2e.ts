import { expect, test, type Page } from '@playwright/test';
import { createAccount, signIn, type Account } from './support/accounts';

function actions(page: Page) {
	return page.getByRole('region', { name: 'Your actions' });
}

async function log(page: Page, film: number, fields: { review?: string; tags?: string } = {}) {
	await page.goto(`/film/${String(film)}`);
	await actions(page)
		.getByRole('button', { name: /Review or log|Log again/ })
		.click();
	const dialog = page.getByRole('dialog');
	if (fields.review) await dialog.getByLabel('Review').fill(fields.review);
	if (fields.tags) await dialog.getByLabel('Tags').fill(fields.tags);
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dialog).toBeHidden();
}

async function pickFilm(page: Page, title: string) {
	const dialog = page.getByRole('dialog');
	await dialog.getByLabel('Name of film').fill(title);
	await dialog.getByRole('button', { name: new RegExp(title) }).click();
	await expect(dialog).toBeHidden();
}

test.describe('profile', () => {
	let account: Account;

	test.beforeEach(async ({ page, request }) => {
		account = await createAccount(request);
		await signIn(page, account);
	});

	test('shows an empty profile with its tabs', async ({ page }) => {
		await page.goto('/profile');

		await expect(page.getByRole('heading', { level: 1 })).toHaveText(account.username);
		await expect(page.getByRole('heading', { name: 'Favorite films' })).toBeHidden();
		await expect(page.getByText('No rating yet.')).toBeVisible();
		const tabs = page.getByRole('navigation', { name: 'Profile' });
		for (const name of [
			'Activity',
			'Films',
			'Diary',
			'Reviews',
			'Watchlist',
			'Lists',
			'Likes',
			'Tags'
		]) {
			await expect(tabs.getByRole('link', { name, exact: true })).toBeVisible();
		}
		await expect(tabs.getByRole('link', { name: 'Profile' })).toHaveAttribute(
			'aria-current',
			'page'
		);
	});

	test('opens from the account menu', async ({ page }) => {
		const navigation = page.getByRole('navigation', { name: 'Main navigation' });
		await navigation.locator('button[aria-haspopup]').hover();
		await navigation.getByRole('link', { name: 'Profile' }).click();

		await expect(page).toHaveURL('/profile');
	});

	test('saves the bio and the location', async ({ page }) => {
		await page.goto('/profile');
		await page.getByRole('link', { name: 'Edit profile' }).click();
		await expect(page).toHaveURL('/settings/profile');

		await page.getByLabel('Location').fill('Adrift');
		await page.getByLabel('Bio').fill('Vocation: hermit\n<b>bold</b>');
		await page.getByRole('main').getByRole('button', { name: 'Save' }).click();
		await expect(page.getByRole('status')).toHaveText('Your profile has been saved.');

		await page.goto('/profile');
		await expect(page.getByText('Adrift')).toBeVisible();
		await expect(page.getByText('<b>bold</b>')).toBeVisible();
	});

	test('chooses and removes favourite films', async ({ page }) => {
		await page.goto('/settings/profile');
		await page.getByRole('button', { name: 'Choose favorite film 2' }).click();
		await pickFilm(page, 'Blade Runner 2049');
		await expect(
			page.getByRole('button', { name: 'Remove Blade Runner 2049 from favorites' })
		).toBeAttached();

		await page.goto('/profile');
		const favourites = page.locator('section', { hasText: 'Favorite films' }).first();
		await expect(favourites.getByRole('listitem')).toHaveCount(4);
		await expect(favourites.getByRole('listitem').nth(1).getByRole('link')).toHaveAttribute(
			'href',
			'/film/335984'
		);
		await expect(favourites.getByRole('link')).toHaveCount(1);

		await page.goto('/settings/profile');
		await page.getByRole('listitem').nth(1).hover();
		await page.getByRole('button', { name: 'Remove Blade Runner 2049 from favorites' }).click();
		await expect(page.getByRole('button', { name: 'Choose favorite film 2' })).toBeVisible();
	});

	test('uses the backdrop of a film as banner and removes it', async ({ page }) => {
		await page.goto('/settings/profile');
		await page.getByRole('button', { name: 'Choose a film' }).click();
		await pickFilm(page, 'Blade Runner 2049');
		await expect(page.getByRole('button', { name: 'Remove banner' })).toBeVisible();

		await page.goto('/profile');
		await expect(page.locator('.backdrop img')).toHaveAttribute('src', /\/w1280\//);

		await page.goto('/settings/profile');
		await page.getByRole('button', { name: 'Remove banner' }).click();
		await expect(page.getByRole('button', { name: 'Remove banner' })).toBeHidden();
		await page.goto('/profile');
		await expect(page.locator('.backdrop')).toHaveCount(0);
	});

	test('summarises the diary, ratings, reviews, lists and tags', async ({ page }) => {
		await log(page, 78, { review: 'Tears in rain.', tags: 'cinema' });
		await actions(page).getByRole('button', { name: '5 out of 5 stars', exact: true }).click();
		await expect(actions(page).getByText('Rated')).toBeVisible();
		await page.goto('/profile/lists/new');
		await page.getByLabel('Name', { exact: true }).fill('Rainy nights');
		await page.getByRole('main').getByRole('button', { name: 'Save' }).click();
		await expect(page).toHaveURL(/\/profile\/lists\/\d+$/);

		await page.goto('/profile');

		const stats = page.locator('dl');
		await expect(stats.locator('div', { hasText: 'Films' }).locator('dd')).toHaveText('1');
		await expect(stats.locator('div', { hasText: 'Lists' }).locator('dd')).toHaveText('1');
		await expect(page.getByRole('heading', { name: 'Recent activity' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Recent reviews' })).toBeVisible();
		await expect(page.getByText('Tears in rain.')).toBeVisible();
		await expect(page.getByRole('img', { name: 'Ratings' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Rainy nights' })).toBeVisible();
		await expect(page.getByText('You watched Blade Runner')).toBeVisible();
		await page.getByRole('link', { name: 'cinema' }).click();
		await expect(page).toHaveURL('/diary?tag=cinema');
	});

	test('pins two reviews at most on the profile', async ({ page }) => {
		await log(page, 78, { review: 'First.' });
		await log(page, 78, { review: 'Second.' });
		await log(page, 335984, { review: 'Third.' });
		await page.goto('/reviews');
		const cards = page.getByRole('article');
		await expect(cards).toHaveCount(3);

		await cards
			.filter({ hasText: 'First.' })
			.getByRole('button', { name: 'Pin to profile' })
			.click();
		await cards
			.filter({ hasText: 'Second.' })
			.getByRole('button', { name: 'Pin to profile' })
			.click();
		await expect(page.getByRole('button', { name: 'Unpin from profile' })).toHaveCount(2);
		await cards
			.filter({ hasText: 'Third.' })
			.getByRole('button', { name: 'Pin to profile' })
			.click();
		await expect(page.getByRole('alert')).toHaveText(
			'You can pin two reviews at most. Unpin one first.'
		);

		await page.goto('/profile');
		const pinned = page.locator('section', { hasText: 'Pinned reviews' }).first();
		await expect(pinned.getByRole('article')).toHaveCount(2);
		await expect(pinned).not.toContainText('Third.');
	});

	test('lists liked films and diary tags on their own pages', async ({ page }) => {
		await log(page, 78, { tags: 'cinema, 35mm' });
		await actions(page).getByRole('button', { name: 'Like', exact: true }).click();
		await expect(actions(page).getByRole('button', { name: 'Liked' })).toBeVisible();

		await page.goto('/likes');
		await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(1);
		await expect(page.locator('a[href="/film/78"]')).toBeVisible();

		await page.goto('/tags');
		await page.getByRole('link', { name: '35mm' }).click();
		await expect(page).toHaveURL('/diary?tag=35mm');
		await expect(page.getByRole('row').filter({ hasText: 'Blade Runner' })).toHaveCount(1);
	});

	test('ignores a diary tag that does not exist', async ({ page }) => {
		await log(page, 78, { tags: 'cinema' });

		await page.goto('/diary?tag=%3Cscript%3E');

		await expect(page.getByRole('row').filter({ hasText: 'Blade Runner' })).toHaveCount(1);
	});
});

test.describe('profile bar', () => {
	test('heads every page of the profile with the account and its tabs', async ({
		page,
		request
	}) => {
		const account = await createAccount(request);
		await signIn(page, account);

		for (const path of [
			'/activity',
			'/watched',
			'/diary',
			'/reviews',
			'/watchlist',
			'/profile/lists',
			'/likes',
			'/tags'
		]) {
			await page.goto(path);
			const bar = page.getByRole('navigation', { name: 'Profile' });
			await expect(bar.getByRole('link', { name: account.username })).toHaveAttribute(
				'href',
				'/profile'
			);
			await expect(bar.locator('a[aria-current="page"]')).toHaveAttribute('href', path);
		}
	});
});

test.describe('profile privacy', () => {
	test('refuses forged favourites and pins', async ({ page, request, baseURL }) => {
		await signIn(page, await createAccount(request));
		await log(page, 78, { review: 'Mine.' });
		await page.goto('/reviews');
		const entryId = await page.locator('input[name="entryId"]').first().inputValue();
		const cookies = await page.context().cookies();

		await page.context().clearCookies();
		await signIn(page, await createAccount(request));
		const headers = { origin: baseURL ?? '' };
		const pin = await page.request.post('/reviews?/pin', {
			headers,
			form: { entryId, pinned: 'true' }
		});
		expect(await pin.text()).toContain('entry_not_found');
		for (const slot of ['0', '5', 'abc']) {
			const response = await page.request.post('/settings/profile?/favourite', {
				headers,
				form: { slot, filmId: '78' }
			});
			expect(await response.text()).toContain('invalid_request');
		}
		const film = await page.request.post('/settings/profile?/banner', {
			headers,
			form: { filmId: '../etc' }
		});
		expect(film.status()).toBe(404);

		await page.context().clearCookies();
		await page.context().addCookies(cookies);
		await page.goto('/profile');
		await expect(page.getByRole('heading', { name: 'Pinned reviews' })).toBeHidden();
	});
});
