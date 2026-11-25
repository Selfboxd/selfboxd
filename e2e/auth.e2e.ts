import { expect, test } from '@playwright/test';
import { admin, createAccount, signIn, submitSignIn, uniqueUsername } from './support/accounts';

const invalidCredentials = 'Incorrect username or password.';

test.describe('sign-in', () => {
	test('sends an anonymous visitor to the sign-in page', async ({ page }) => {
		await page.goto('/');

		await expect(page).toHaveURL('/login');
		await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
	});

	test('returns to the requested page after signing in', async ({ page, request }) => {
		const account = await createAccount(request);

		await page.goto('/settings/auth');
		await expect(page).toHaveURL('/login?redirectTo=%2Fsettings%2Fauth');
		await submitSignIn(page, account);

		await expect(page).toHaveURL('/settings/auth');
	});

	test('never redirects to another site after signing in', async ({ page, request }) => {
		const account = await createAccount(request);

		await page.goto('/login?redirectTo=https%3A%2F%2Fattacker.example');
		await submitSignIn(page, account);

		await expect(page).toHaveURL('/');
	});

	test('accepts the username in any case', async ({ page, request }) => {
		const account = await createAccount(request);

		await page.goto('/login');
		await submitSignIn(page, { ...account, username: account.username.toUpperCase() });

		await expect(page).toHaveURL('/');
	});

	test('shows the same error for a wrong password and an unknown account', async ({
		page,
		request
	}) => {
		const account = await createAccount(request);

		await page.goto('/login');
		await submitSignIn(page, { ...account, password: 'wrong-password' });
		await expect(page.getByRole('alert')).toHaveText(invalidCredentials);

		await page.goto('/login');
		await submitSignIn(page, { username: uniqueUsername('ghost'), password: 'wrong-password' });
		await expect(page.getByRole('alert')).toHaveText(invalidCredentials);
	});

	test('slows down repeated failures, for unknown accounts too', async ({ page, request }) => {
		const ghost = { username: uniqueUsername('ghost'), password: 'wrong-password' };

		await page.goto('/login');
		for (let attempt = 0; attempt < 3; attempt += 1) {
			await request.post('/api/v1/auth/login', { data: { ...ghost, deviceName: 'Test device' } });
		}
		await submitSignIn(page, ghost);

		await expect(page.getByRole('alert')).toContainText('Too many attempts');
	});

	test('sends a signed-in account away from the sign-in page', async ({ page, request }) => {
		await signIn(page, await createAccount(request));

		await page.goto('/login');

		await expect(page).toHaveURL('/');
	});
});

test.describe('session cookie', () => {
	test('is not readable by scripts and is not sent across sites', async ({ page, context }) => {
		await signIn(page, admin);

		const cookie = (await context.cookies()).find((entry) => entry.name === 'selfboxd_session');
		expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
	});
});

test.describe('sign-out', () => {
	test('returns to the sign-in page', async ({ page, request }) => {
		await signIn(page, await createAccount(request));

		await page.getByRole('button', { name: 'Sign out' }).click();

		await expect(page).toHaveURL('/login');
		await page.goto('/');
		await expect(page).toHaveURL('/login');
	});

	test('invalidates the session on the server', async ({ page, context, request }) => {
		await signIn(page, await createAccount(request));
		const cookies = await context.cookies();

		await page.getByRole('button', { name: 'Sign out' }).click();
		await expect(page).toHaveURL('/login');
		await context.addCookies(cookies);
		await page.goto('/');

		await expect(page).toHaveURL('/login');
	});
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('signs in and out with plain form submissions', async ({ page, request }) => {
		const account = await createAccount(request);

		await page.goto('/login');
		await submitSignIn(page, account);
		await expect(page).toHaveURL('/');

		await page.getByRole('button', { name: 'Sign out' }).click();
		await expect(page).toHaveURL('/login');
	});
});
