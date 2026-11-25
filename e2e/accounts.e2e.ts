import { expect, test } from '@playwright/test';
import {
	admin,
	apiSignIn,
	bearer,
	createAccount,
	signIn,
	uniqueUsername
} from './support/accounts';

test.describe('account administration', () => {
	test('lets the administrator create an account that can sign in', async ({ page, request }) => {
		const account = { username: uniqueUsername(), password: 'user-password-1' };
		await signIn(page, admin);

		await page.goto('/settings/accounts');
		const form = page.locator('form[action="?/create"]');
		await form.getByLabel('Username').fill(account.username);
		await form.getByLabel('Password').fill(account.password);
		await form.getByRole('button', { name: 'Create account' }).click();

		await expect(page.getByRole('status')).toHaveText(
			`The account ${account.username} has been created.`
		);
		await expect(page.getByRole('listitem').filter({ hasText: account.username })).toBeVisible();
		await apiSignIn(request, account);
	});

	test('refuses a username that is already taken', async ({ page, request }) => {
		const existing = await createAccount(request);
		await signIn(page, admin);

		await page.goto('/settings/accounts');
		const form = page.locator('form[action="?/create"]');
		await form.getByLabel('Username').fill(existing.username);
		await form.getByLabel('Password').fill('user-password-2');
		await form.getByRole('button', { name: 'Create account' }).click();

		await expect(page.getByRole('alert')).toHaveText('This username is already taken.');
	});

	test('refuses an invalid username', async ({ page }) => {
		await signIn(page, admin);

		await page.goto('/settings/accounts');
		const form = page.locator('form[action="?/create"]');
		await form.getByLabel('Username').fill('<script>alert(1)</script>');
		await form.getByLabel('Password').fill('user-password-1');
		await form.getByRole('button', { name: 'Create account' }).click();

		await expect(page.getByRole('alert')).toContainText('The username must be');
	});

	test('lets the administrator set a new password, which signs the account out', async ({
		page,
		request
	}) => {
		const account = await createAccount(request);
		const token = await apiSignIn(request, account);
		await signIn(page, admin);

		await page.goto('/settings/accounts');
		const form = page.locator('form[action="?/password"]');
		await form.getByLabel('Account').selectOption({ label: account.username });
		await form.getByLabel('New password').fill('reset-password-1');
		await form.getByRole('button', { name: 'Set password' }).click();

		await expect(page.getByRole('status')).toHaveText(
			`The password of ${account.username} has been changed.`
		);
		const session = await request.get('/api/v1/auth/session', { headers: bearer(token) });
		expect(session.status()).toBe(401);
		await apiSignIn(request, { ...account, password: 'reset-password-1' });
	});
});

test.describe('regular account', () => {
	test('does not see the account administration', async ({ page, request }) => {
		await signIn(page, await createAccount(request));

		await page.goto('/settings/auth');
		await expect(page.getByRole('link', { name: 'Accounts' })).toBeHidden();

		const response = await page.goto('/settings/accounts');
		expect(response?.status()).toBe(403);
		await expect(page.getByText('You do not have access to this page.')).toBeVisible();
	});

	test('cannot create an account by posting the form directly', async ({
		page,
		request,
		baseURL
	}) => {
		await signIn(page, await createAccount(request));
		const target = { username: uniqueUsername('forged'), password: 'forged-password-1' };

		const response = await page.request.post('/settings/accounts?/create', {
			headers: { origin: baseURL ?? '' },
			form: target
		});

		expect(await response.text()).not.toContain('"success"');
		const login = await request.post('/api/v1/auth/login', {
			data: { ...target, deviceName: 'Test device' }
		});
		expect(login.status()).toBe(401);
	});

	test('cannot change the password of another account by posting the form directly', async ({
		page,
		request,
		baseURL
	}) => {
		await signIn(page, await createAccount(request));

		await page.request.post('/settings/accounts?/password', {
			headers: { origin: baseURL ?? '' },
			form: { userId: '1', password: 'forged-password-1' }
		});

		await apiSignIn(request, admin);
	});
});
