import { expect, test } from '@playwright/test';
import { admin } from '../support/accounts';

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
});
