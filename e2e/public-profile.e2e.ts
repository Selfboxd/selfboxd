import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { createAccount, signIn, type Account } from './support/accounts';

const platform = 'http://localhost:4177';

interface Published {
	key: string;
	publishes: number;
	payload: {
		accessCode: string | null;
		avatar: unknown;
		profile: {
			name: string;
			works: { id: number; posterPath: string | null }[];
			diary: { work: number; review: string }[];
			watchlist: unknown[];
			lists: { name: string; items: { work: number; note: string }[] }[];
		};
	} | null;
}

async function published(request: APIRequestContext, handle: string): Promise<Published | null> {
	const response = await request.get(`${platform}/__profiles/${handle}`);
	return response.ok() ? ((await response.json()) as Published) : null;
}

function handleOf(account: Account): string {
	return account.username.toLowerCase();
}

async function enable(page: Page, code = '') {
	await page.goto('/settings/public');
	if (code) {
		await page.getByLabel('Access code 1').click();
		await page.keyboard.type(code);
	}
	await page.getByRole('button', { name: 'Publish my profile' }).click();
	await expect(page.getByRole('heading', { name: 'Your public profile' })).toBeVisible();
}

async function recoveryKey(page: Page): Promise<string> {
	await page.goto('/settings/public');
	await page.getByRole('button', { name: 'Show the key' }).click();
	return page.getByRole('textbox', { name: 'Recovery key' }).inputValue();
}

test.describe('public profile', () => {
	let account: Account;

	test.beforeEach(async ({ page, request }) => {
		account = await createAccount(request);
		await signIn(page, account);
	});

	test('is off by default and sends nothing', async ({ page, request }) => {
		await page.goto('/settings');
		await page.getByRole('link', { name: 'Public profile' }).click();
		await expect(page).toHaveURL('/settings/public');
		await expect(page.getByRole('button', { name: 'Publish my profile' })).toBeVisible();
		await expect(page.getByLabel('Address')).toHaveValue(handleOf(account));
		expect(await published(request, handleOf(account))).toBeNull();
	});

	test('publishes a copy of the profile, then every change right away', async ({
		page,
		request
	}) => {
		await enable(page);
		const handle = handleOf(account);
		await expect(page.getByRole('link', { name: `localhost:4177/${handle}` })).toBeVisible();
		const first = await published(request, handle);
		expect(first?.payload?.profile.name).toBe(account.username);
		expect(first?.payload?.accessCode).toBeNull();

		await page.goto('/film/78');
		const actions = page.getByRole('region', { name: 'Your actions' });
		await actions.getByRole('button', { name: /Review or log/ }).click();
		await page.getByRole('dialog').getByLabel('Review').fill('Tears in rain.');
		await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
		await expect(page.getByRole('dialog')).toBeHidden();

		await expect
			.poll(async () => (await published(request, handle))?.payload?.profile.diary.length)
			.toBe(1);
		const after = await published(request, handle);
		expect(after?.payload?.profile.diary[0]?.review).toBe('Tears in rain.');
		expect(after?.payload?.profile.works[0]?.id).toBe(78);
		expect(JSON.stringify(after)).not.toContain('localhost:4173');
	});

	test('sends the poster chosen by the account', async ({ page, request }) => {
		await enable(page);
		await page.goto('/film/78');
		const actions = page.getByRole('region', { name: 'Your actions' });
		await actions.getByRole('button', { name: 'Watch', exact: true }).click();
		await actions.getByRole('button', { name: 'Change poster…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Select your preferred poster' });
		await dialog.getByRole('option').last().getByRole('button').click();
		await dialog.getByRole('button', { name: 'Save changes' }).click();

		await expect
			.poll(
				async () =>
					(await published(request, handleOf(account)))?.payload?.profile.works[0]?.posterPath
			)
			.toBe('/alternate-poster.jpg');
	});

	test('protects the profile with an access code, and removes it', async ({ page, request }) => {
		await enable(page, '2468');
		const handle = handleOf(account);
		expect((await published(request, handle))?.payload?.accessCode).toBe('2468');
		await expect(page.getByText('Visitors need the code 2468.')).toBeVisible();

		await page.getByRole('button', { name: 'Remove the code' }).click();
		await expect(page.getByText('Anyone with the address can see your profile.')).toBeVisible();
		expect((await published(request, handle))?.payload?.accessCode).toBeNull();
	});

	test('refuses an address already taken', async ({ page, browser, request }) => {
		await enable(page);
		const other = await browser.newPage();
		await signIn(other, await createAccount(request));
		await other.goto('/settings/public');
		await other.getByLabel('Address').fill(handleOf(account));
		await other.getByRole('button', { name: 'Publish my profile' }).click();
		await expect(other.getByRole('alert')).toHaveText('This address is already taken.');
		await other.close();
	});

	test('moves to another account with the recovery key, until the key changes', async ({
		page,
		browser,
		request
	}) => {
		await enable(page);
		const handle = handleOf(account);
		const key = await recoveryKey(page);
		expect(key).toMatch(/^SBXD1-[A-Za-z0-9_-]{43}$/);

		const elsewhere = await browser.newPage();
		const moved = await createAccount(request);
		await signIn(elsewhere, moved);
		await elsewhere.goto('/settings/public');
		await elsewhere.getByLabel('Recovery key').fill(key);
		await elsewhere.getByRole('button', { name: 'Restore' }).click();
		await expect(elsewhere.getByRole('link', { name: `localhost:4177/${handle}` })).toBeVisible();
		await expect
			.poll(async () => (await published(request, handle))?.payload?.profile.name)
			.toBe(moved.username);

		const before = (await published(request, handle))?.key;
		await elsewhere.getByRole('button', { name: 'Change the key' }).click();
		await expect(elsewhere.getByText('The key has been changed.')).toBeVisible();
		expect((await published(request, handle))?.key).not.toBe(before);
		expect(await elsewhere.getByRole('textbox', { name: 'Recovery key' }).inputValue()).not.toBe(
			key
		);

		const third = await browser.newPage();
		await signIn(third, await createAccount(request));
		await third.goto('/settings/public');
		await third.getByLabel('Recovery key').fill(key);
		await third.getByRole('button', { name: 'Restore' }).click();
		await expect(third.getByRole('alert')).toHaveText('No public profile matches this key.');
		await third.getByLabel('Recovery key').fill('not a key');
		await third.getByRole('button', { name: 'Restore' }).click();
		await expect(third.getByRole('alert')).toHaveText('This is not a recovery key.');
		await elsewhere.close();
		await third.close();
	});

	test('waits for the platform when it cannot be reached, then sends', async ({
		page,
		request
	}) => {
		await enable(page);
		const handle = handleOf(account);
		const before = (await published(request, handle))?.publishes ?? 0;
		await request.get(`${platform}/__offline?handle=${handle}&value=true`);
		try {
			await page.goto('/settings/profile');
			await page.getByLabel('Bio').fill('Offline for a while.');
			await page.getByRole('button', { name: 'Save' }).first().click();
			await page.goto('/settings/public');
			await page.getByRole('button', { name: 'Send now' }).click();
			await expect(page.getByRole('alert')).toContainText('cannot be reached');
		} finally {
			await request.get(`${platform}/__offline?handle=${handle}&value=false`);
		}
		await expect
			.poll(async () => (await published(request, handle))?.publishes ?? 0, { timeout: 15_000 })
			.toBeGreaterThan(before);
	});

	test('deletes the copy from the platform', async ({ page, request }) => {
		await enable(page);
		await page.getByRole('button', { name: 'Delete the public profile' }).click();
		await expect(page.getByText('Delete your public profile from the platform?')).toBeVisible();
		await page.getByRole('button', { name: 'Delete the public profile' }).click();
		await expect(page.getByRole('button', { name: 'Publish my profile' })).toBeVisible();
		expect(await published(request, handleOf(account))).toBeNull();
	});
});

test.describe('shared lists', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	async function sharedList(request: APIRequestContext, url: string) {
		const code = url.split('/').pop() ?? '';
		const response = await request.get(`${platform}/__shares/${code}`);
		return response.ok()
			? ((await response.json()) as {
					name: string;
					items: { kind: string; id: number; note: string }[];
				})
			: null;
	}

	test('share a list of the account with TMDB identifiers only, update it and stop', async ({
		page,
		request
	}) => {
		await page.goto('/profile/lists/new');
		await page.getByLabel('Name', { exact: true }).fill('Rainy nights');
		await page.getByRole('main').getByRole('button', { name: 'Save' }).click();
		await expect(page).toHaveURL(/\/profile\/lists\/\d+$/, { timeout: 15_000 });
		const path = new URL(page.url()).pathname;
		await page.goto('/film/78');
		await page.getByRole('button', { name: 'Add film to lists…' }).click();
		await page.getByRole('dialog', { name: 'Add to lists' }).getByLabel('Rainy nights').check();
		await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

		await page.goto(path);
		const panel = page.getByRole('complementary');
		await panel.getByRole('button', { name: 'Share', exact: true }).click();
		const link = panel.getByRole('link', { name: /^sbxd\.test\/share\// });
		await expect(link).toHaveAttribute('href', /^http:\/\/sbxd\.test\/share\/[A-Za-z0-9]{6}$/);
		const url = (await link.getAttribute('href')) ?? '';
		expect(await sharedList(request, url)).toMatchObject({
			name: 'Rainy nights',
			description: '',
			ranked: false,
			items: [{ kind: 'film', id: 78, note: '' }]
		});

		await page.reload();
		await expect(link).toHaveAttribute('href', url);
		await panel.getByRole('button', { name: 'Update the shared list' }).click();
		await expect(link).toHaveAttribute('href', url);

		await panel.getByRole('button', { name: 'Stop sharing' }).click();
		await expect(panel.getByRole('button', { name: 'Share', exact: true })).toBeVisible();
		expect(await sharedList(request, url)).toBeNull();
	});

	test('share an official chart', async ({ page, request }) => {
		await page.goto('/lists/official/popular');
		await page
			.getByRole('complementary')
			.getByRole('button', { name: 'Share', exact: true })
			.click();
		const url =
			(await page
				.getByRole('complementary')
				.getByRole('link', { name: /^sbxd\.test\/share\// })
				.getAttribute('href')) ?? '';
		const list = await sharedList(request, url);
		expect(list?.name).toBe('Popular films');
		expect(list?.items.map((item) => item.id)).toContain(78);
	});
});
