import { expect, test } from '@playwright/test';
import { admin, apiSignIn, bearer, createAccount, signIn } from '../support/accounts';

test.describe('first launch', () => {
	for (const path of ['/', '/login', '/settings/auth']) {
		test(`sends ${path} to the setup screen`, async ({ page }) => {
			await page.goto(path);

			await expect(page).toHaveURL('/setup');
			await expect(
				page.getByRole('heading', { name: 'Create the administrator account' })
			).toBeVisible();
		});
	}

	test('refuses API calls until an account exists', async ({ request }) => {
		const response = await request.post('/api/v1/auth/login', {
			data: { ...admin, deviceName: 'Test device' }
		});

		expect(response.status()).toBe(409);
		expect(await response.json()).toEqual({ error: 'setup_required' });
	});

	test('keeps the health check available', async ({ request }) => {
		expect((await request.get('/api/v1/health')).status()).toBe(200);
	});

	test('rejects an invalid username', async ({ page }) => {
		await page.goto('/setup');
		await page.getByLabel('Username').fill('not a username');
		await page.getByLabel('Password', { exact: true }).fill(admin.password);
		await page.getByLabel('Confirm password').fill(admin.password);
		await page.getByRole('button', { name: 'Create account' }).click();

		await expect(page.getByRole('alert')).toContainText('The username must be');
		await expect(page).toHaveURL('/setup');
	});

	test('rejects a short password', async ({ page }) => {
		await page.goto('/setup');
		await page.getByLabel('Username').fill(admin.username);
		await page.getByLabel('Password', { exact: true }).fill('short');
		await page.getByLabel('Confirm password').fill('short');
		await page.getByRole('button', { name: 'Create account' }).click();

		await expect(page.getByRole('alert')).toContainText('at least 8 characters');
	});

	test('rejects passwords that do not match', async ({ page }) => {
		await page.goto('/setup');
		await page.getByLabel('Username').fill(admin.username);
		await page.getByLabel('Password', { exact: true }).fill(admin.password);
		await page.getByLabel('Confirm password').fill(`${admin.password}-typo`);
		await page.getByRole('button', { name: 'Create account' }).click();

		await expect(page.getByRole('alert')).toContainText('The passwords do not match');
	});

	test('creates the administrator and signs it in', async ({ page }) => {
		await page.goto('/setup');
		await page.getByLabel('Username').fill(admin.username);
		await page.getByLabel('Password', { exact: true }).fill(admin.password);
		await page.getByLabel('Confirm password').fill(admin.password);
		await page.getByRole('button', { name: 'Create account' }).click();

		await expect(page).toHaveURL('/');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome back, admin.');

		await page.goto('/settings/accounts');
		await expect(page.getByText('Administrator', { exact: true })).toBeVisible();
	});

	test('closes the setup screen once the administrator exists', async ({ page }) => {
		await page.goto('/setup');

		await expect(page).toHaveURL('/login');
	});

	test('cannot create a second account through the setup form', async ({ request, baseURL }) => {
		const intruder = { username: 'intruder', password: 'intruder-password-1' };

		await request.post('/setup', {
			headers: { origin: baseURL ?? '' },
			form: { ...intruder, confirmation: intruder.password }
		});

		const response = await request.post('/api/v1/auth/login', {
			data: { ...intruder, deviceName: 'Test device' }
		});
		expect(response.status()).toBe(401);
	});

	test('asks the administrator for a TMDB key before showing films', async ({ page }) => {
		await signIn(page, admin);

		await page.goto('/film/78');

		await expect(page.getByRole('status')).toContainText('Add a TMDB API key in the settings');
		await page.getByRole('link', { name: 'Open the settings' }).click();
		await expect(page).toHaveURL('/settings/instance');
		await expect(page.getByText('No key yet.')).toBeVisible();
	});

	test('tells a regular account to wait for the administrator', async ({ page, request }) => {
		await signIn(page, await createAccount(request));

		await page.goto('/search?q=blade');

		await expect(page.getByRole('status')).toContainText(
			'The administrator of this instance has not added a TMDB API key yet.'
		);
		await expect(page.getByRole('link', { name: 'Open the settings' })).toBeHidden();
	});

	test('reports the missing TMDB key through the API', async ({ request }) => {
		const token = await apiSignIn(request, admin);

		const response = await request.get('/api/v1/films/78', { headers: bearer(token) });

		expect(response.status()).toBe(503);
		expect(await response.json()).toEqual({ error: 'tmdb_not_configured' });
	});

	test('rejects a TMDB key that TMDB does not accept', async ({ page }) => {
		await signIn(page, admin);

		await page.goto('/settings/instance');
		await page.getByLabel('TMDB API key').fill('wrong-key');
		await page.getByRole('button', { name: 'Save key' }).click();

		await expect(page.getByRole('alert')).toHaveText('TMDB did not accept this key.');
		await expect(page.getByRole('button', { name: 'Remove the TMDB key' })).toHaveCount(0);
	});

	test('saves a valid TMDB key without ever showing it again', async ({ page }) => {
		await signIn(page, admin);

		await page.goto('/settings/instance');
		await page.getByLabel('TMDB API key').fill('valid-test-key');
		await page.getByRole('button', { name: 'Save key' }).click();

		await expect(page.getByRole('status')).toHaveText('The TMDB key has been saved.');
		await page.reload();
		await expect(page.getByRole('button', { name: 'Remove the TMDB key' })).toBeVisible();
		expect(await page.content()).not.toContain('valid-test-key');
	});

	test('explains the missing MDBList key on the lists catalogue', async ({ page }) => {
		await signIn(page, admin);

		await page.goto('/lists');

		await expect(page.getByRole('status')).toContainText(
			'Add an MDBList API key in the settings to browse public lists.'
		);
		expect((await page.goto('/lists/101'))?.status()).toBe(404);
	});

	test('rejects an MDBList key that MDBList does not accept', async ({ page }) => {
		await signIn(page, admin);

		await page.goto('/settings/instance');
		await page.getByLabel('MDBList API key').fill('wrong-key');
		await page.getByRole('button', { name: 'Save MDBList key' }).click();

		await expect(page.getByRole('alert')).toHaveText('MDBList did not accept this key.');
		await expect(page.getByRole('button', { name: 'Remove the MDBList key' })).toHaveCount(0);
	});

	test('saves and removes a valid MDBList key without ever showing it again', async ({ page }) => {
		await signIn(page, admin);
		await page.goto('/settings/instance');

		for (const round of [1, 2]) {
			await page.getByLabel('MDBList API key').fill('valid-mdblist-key');
			await page.getByRole('button', { name: 'Save MDBList key' }).click();
			await expect(page.getByRole('status')).toHaveText('The MDBList key has been saved.');
			const remove = page.getByRole('button', { name: 'Remove the MDBList key' });
			await expect(remove).toBeVisible();
			expect(await page.content()).not.toContain('valid-mdblist-key');
			if (round === 1) {
				await remove.click();
				await expect(remove).toHaveCount(0);
			}
		}
	});
});
