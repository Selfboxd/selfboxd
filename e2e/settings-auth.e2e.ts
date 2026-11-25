import { expect, test, type Page } from '@playwright/test';
import { apiSignIn, bearer, createAccount, signIn } from './support/accounts';

async function changePassword(page: Page, current: string, next: string, confirmation = next) {
	await page.goto('/settings/auth');
	await page.getByLabel('Current password').fill(current);
	await page.getByLabel('New password').fill(next);
	await page.getByLabel('Confirm password').fill(confirmation);
	await page.getByRole('button', { name: 'Change password' }).click();
}

test.describe('password change', () => {
	test('replaces the password', async ({ page, request }) => {
		const account = await createAccount(request);
		await signIn(page, account);

		await changePassword(page, account.password, 'new-password-1');

		await expect(page.getByRole('status')).toContainText('Your password has been changed');
		const oldLogin = await request.post('/api/v1/auth/login', {
			data: { ...account, deviceName: 'Test device' }
		});
		expect(oldLogin.status()).toBe(401);
		await apiSignIn(request, { ...account, password: 'new-password-1' });
	});

	test('requires the current password', async ({ page, request }) => {
		const account = await createAccount(request);
		await signIn(page, account);

		await changePassword(page, 'wrong-password', 'new-password-1');

		await expect(page.getByRole('alert')).toHaveText('The current password is incorrect.');
		await apiSignIn(request, account);
	});

	test('rejects passwords that do not match', async ({ page, request }) => {
		const account = await createAccount(request);
		await signIn(page, account);

		await changePassword(page, account.password, 'new-password-1', 'new-password-2');

		await expect(page.getByRole('alert')).toHaveText('The passwords do not match.');
	});

	test('signs out the other sessions and keeps the current one', async ({ page, request }) => {
		const account = await createAccount(request);
		const token = await apiSignIn(request, account);
		await signIn(page, account);

		await changePassword(page, account.password, 'new-password-1');
		await expect(page.getByRole('status')).toBeVisible();

		const session = await request.get('/api/v1/auth/session', { headers: bearer(token) });
		expect(session.status()).toBe(401);
		await page.goto('/');
		await expect(page).toHaveURL('/');
	});
});

test.describe('sessions and devices', () => {
	test('lists the current session and the devices', async ({ page, request }) => {
		const account = await createAccount(request);
		await apiSignIn(request, account, 'Phone of Ada');
		await signIn(page, account);

		await page.goto('/settings/auth');

		await expect(page.getByText('This session')).toBeVisible();
		await expect(page.getByText('Phone of Ada')).toBeVisible();
	});

	test('signs a device out', async ({ page, request }) => {
		const account = await createAccount(request);
		const token = await apiSignIn(request, account, 'Phone of Ada');
		await signIn(page, account);

		await page.goto('/settings/auth');
		await page
			.getByRole('listitem')
			.filter({ hasText: 'Phone of Ada' })
			.getByRole('button', { name: 'Sign out' })
			.click();

		await expect(page.getByText('Phone of Ada')).toBeHidden();
		const session = await request.get('/api/v1/auth/session', { headers: bearer(token) });
		expect(session.status()).toBe(401);
	});

	test('signing the current session out returns to the sign-in page', async ({ page, request }) => {
		await signIn(page, await createAccount(request));

		await page.goto('/settings/auth');
		await page
			.getByRole('listitem')
			.filter({ hasText: 'This session' })
			.getByRole('button', { name: 'Sign out' })
			.click();

		await expect(page).toHaveURL('/login');
	});
});
