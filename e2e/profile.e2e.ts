import { expect, test, type Page } from '@playwright/test';
import { createAccount, signIn, type Account } from './support/accounts';
import { fillTags } from './support/fields';

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
	if (fields.tags) await fillTags(dialog, 'Tags', fields.tags);
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dialog).toBeHidden();
}

async function pickFilm(page: Page, title: string) {
	const dialog = page.getByRole('dialog');
	await dialog.getByLabel('Name of the film').fill(title);
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
			'Likes'
		]) {
			await expect(tabs.getByRole('link', { name, exact: true })).toBeVisible();
		}
		await expect(tabs.getByRole('link', { name: 'Tags', exact: true })).toHaveCount(0);
		await expect(tabs.getByRole('link', { name: 'Profile' })).toHaveAttribute(
			'aria-current',
			'page'
		);
	});

	test('opens from the account menu', async ({ page }) => {
		const navigation = page.getByRole('navigation', { name: 'Main navigation' });
		await navigation.locator('button[aria-haspopup="true"]').hover();
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
		await expect(page.getByRole('complementary').getByText('<b>bold</b>')).toBeVisible();
	});

	test('shows links to a website and networks under the name', async ({ page }) => {
		await page.goto('/settings/profile');
		await page.getByRole('textbox', { name: 'Website' }).fill('ada.example');
		await page
			.getByRole('textbox', { name: 'Instagram' })
			.fill('https://instagram.com/ada.watches');
		await page.getByRole('textbox', { name: 'X', exact: true }).fill('@ada_x');
		await page.getByRole('main').getByRole('button', { name: 'Save' }).click();
		await expect(page.getByRole('status')).toHaveText('Your profile has been saved.');

		await page.goto('/profile');
		await expect(page.getByRole('link', { name: 'ada.example' })).toHaveAttribute(
			'href',
			'https://ada.example/'
		);
		await expect(page.getByRole('link', { name: 'ada.watches' })).toHaveAttribute(
			'href',
			'https://www.instagram.com/ada.watches/'
		);
		await expect(page.getByRole('link', { name: 'ada_x' })).toHaveAttribute(
			'href',
			'https://x.com/ada_x'
		);

		await page.goto('/settings/profile');
		await page.getByRole('textbox', { name: 'Website' }).fill('javascript:alert(1)');
		await page.getByRole('main').getByRole('button', { name: 'Save' }).click();
		await expect(page.getByRole('alert')).toContainText('One of the links is not valid.');
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

	test('takes the banner from a film and removes it in the settings', async ({ page }) => {
		await page.goto('/settings/profile');
		await expect(page.getByText('Choose the banner from any film')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Remove banner' })).toHaveCount(0);

		await page.goto('/film/78');
		await actions(page).getByRole('button', { name: 'Change backdrop…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Select your preferred backdrop' });
		await dialog.getByRole('option').last().getByRole('button').click();
		await dialog.getByRole('button', { name: 'Use as profile banner' }).click();
		await expect(page.getByRole('status')).toHaveText('Your profile banner has been changed.');
		await dialog.getByRole('button', { name: 'Close' }).click();

		await page.goto('/profile');
		await expect(page.locator('.backdrop img')).toHaveAttribute(
			'src',
			/\/w1280\/alternate-backdrop\.jpg$/
		);

		await page.goto('/settings/profile');
		await page.getByRole('button', { name: 'Remove banner' }).click();
		await expect(page.getByRole('button', { name: 'Remove banner' })).toBeHidden();
		await page.goto('/profile');
		await expect(page.locator('.backdrop')).toHaveCount(0);
	});

	test('summarises the diary, ratings, reviews and lists', async ({ page }) => {
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
		const ratings = page.getByRole('list', { name: 'Ratings' });
		await ratings.getByRole('button', { name: '5 out of 5 stars: 1' }).hover();
		await expect(ratings.getByText('ratings (100%)')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Rainy nights' })).toBeVisible();
		await expect(page.getByText('You watched Blade Runner')).toBeVisible();
		await expect(page.getByRole('link', { name: 'cinema', exact: true })).toHaveCount(0);
	});

	test('pins the two latest reviews tagged profile', async ({ page }) => {
		await log(page, 78, { review: 'First.', tags: 'profile' });
		await log(page, 78, { review: 'Second.', tags: 'Profile' });
		await log(page, 335984, { review: 'Third.', tags: 'profile' });
		await log(page, 335984, { review: 'Untagged.' });
		await page.goto('/reviews');
		await expect(page.getByText('Tag a review profile to pin it')).toBeVisible();

		await page.goto('/profile');
		const pinned = page.locator('section', { hasText: 'Pinned reviews' }).first();
		await expect(pinned.getByRole('article')).toHaveCount(2);
		await expect(pinned).not.toContainText('Untagged.');
	});

	test('pins the lists tagged profile', async ({ page }) => {
		for (const { name, tags } of [
			{ name: 'Neon', tags: 'profile' },
			{ name: 'Rain', tags: '' },
			{ name: 'Night', tags: 'profile, noir' }
		]) {
			await page.goto('/profile/lists/new');
			await page.getByLabel('Name', { exact: true }).fill(name);
			if (tags) await fillTags(page.getByRole('main'), 'Tags', tags);
			await page.getByRole('button', { name: 'Save' }).click();
			await expect(page.getByRole('heading', { name })).toBeVisible();
		}

		await page.goto('/profile');
		const pinned = page.locator('section', { hasText: 'Pinned lists' });
		await expect(pinned.getByRole('link', { name: 'Neon' })).toBeVisible();
		await expect(pinned.getByRole('link', { name: 'Night' })).toBeVisible();
		await expect(pinned.getByRole('link', { name: 'Rain' })).toHaveCount(0);
		await expect(
			page.getByRole('navigation', { name: 'Profile' }).getByRole('link', { name: 'Tags' })
		).toHaveCount(0);
	});

	test('lists liked films on their own page', async ({ page }) => {
		await log(page, 78, { tags: 'cinema, 35mm' });
		await actions(page).getByRole('button', { name: 'Like', exact: true }).click();
		await expect(actions(page).getByRole('button', { name: 'Liked' })).toBeVisible();

		await page.goto('/likes');
		await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(1);
		await expect(page.locator('a[href="/film/78"]')).toBeVisible();

		await page.goto('/diary?tag=35mm');
		await expect(page.getByRole('row').filter({ hasText: 'Blade Runner' })).toHaveCount(1);
	});

	test('ignores a diary tag that does not exist', async ({ page }) => {
		await log(page, 78, { tags: 'cinema' });

		await page.goto('/diary?tag=%3Cscript%3E');

		await expect(page.getByRole('row').filter({ hasText: 'Blade Runner' })).toHaveCount(1);
	});
});

test.describe('review page', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	test('opens from the diary and the activity, and edits the review', async ({ page }) => {
		await log(page, 78, { review: 'Tears in rain.\n\nStill unmatched.', tags: 'cinema' });

		await page.goto('/diary');
		await page.getByRole('link', { name: 'Read the review' }).click();
		await expect(page).toHaveURL(/\/reviews\/\d+$/);
		const main = page.getByRole('main');
		await expect(main.getByText(/^Review by /)).toBeVisible();
		await expect(main.getByRole('heading', { name: /Blade Runner/ })).toBeVisible();
		await expect(main.getByText('Still unmatched.')).toBeVisible();
		await expect(main.getByRole('list', { name: 'Tags' })).toHaveText('cinema');
		const address = page.url();

		await main.getByRole('button', { name: 'Edit or delete this review…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Edit diary entry' });
		await dialog.getByLabel('Review').fill('Changed my mind.');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toBeHidden();
		await expect(main.getByText('Changed my mind.')).toBeVisible();

		await page.goto('/activity');
		await page.getByRole('link', { name: 'Read the review' }).first().click();
		await expect(page).toHaveURL(address);
	});

	test('cuts a long review on the reviews page, with the rest on its own page', async ({
		page
	}) => {
		const review = `${'A long thought. '.repeat(40)}The end.`;
		await log(page, 78, { review });

		await page.goto('/reviews');
		const card = page.getByRole('article');
		await expect(card.getByText('The end.')).toHaveCount(0);
		await card.getByRole('link', { name: 'More' }).click();
		await expect(page).toHaveURL(/\/reviews\/\d+$/);
		await expect(page.getByText(/The end\.$/)).toBeVisible();
	});

	test('is not found for an entry of another account', async ({ page, request }) => {
		await log(page, 78, { review: 'Mine.' });
		await page.goto('/diary');
		const address = await page.getByRole('link', { name: 'Read the review' }).getAttribute('href');

		await page.context().clearCookies();
		await signIn(page, await createAccount(request));
		const response = await page.goto(address ?? '/');
		expect(response?.status()).toBe(404);
		expect((await page.goto('/reviews/abc'))?.status()).toBe(404);
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
			'/likes'
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
	test('refuses forged favourites', async ({ page, request, baseURL }) => {
		await signIn(page, await createAccount(request));
		const cookies = await page.context().cookies();

		await page.context().clearCookies();
		await signIn(page, await createAccount(request));
		const headers = { origin: baseURL ?? '' };
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
