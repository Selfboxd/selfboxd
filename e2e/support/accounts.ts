import { randomBytes } from 'node:crypto';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export interface Account {
	username: string;
	password: string;
}

/** The administrator created by the first-launch tests. */
export const admin: Account = { username: 'admin', password: 'admin-password-1' };

/** Returns a username that no other test uses. */
export function uniqueUsername(prefix = 'user'): string {
	return `${prefix}_${randomBytes(6).toString('hex')}`;
}

/** Fills and submits the sign-in form, without checking the outcome. */
export async function submitSignIn(page: Page, account: Account): Promise<void> {
	await page.getByLabel('Username').fill(account.username);
	await page.getByLabel('Password').fill(account.password);
	await page.getByRole('button', { name: 'Sign in' }).click();
}

/** Signs an account in through the sign-in page and waits for the home page. */
export async function signIn(page: Page, account: Account): Promise<void> {
	await page.goto('/login');
	await submitSignIn(page, account);
	await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
}

/** Opens the account menu of the header and signs out. */
export async function signOut(page: Page): Promise<void> {
	const navigation = page.getByRole('navigation', { name: 'Main navigation' });
	await navigation.locator('summary').click();
	await navigation.getByRole('button', { name: 'Sign out' }).click();
}

/** Signs an account in through the API and returns its device token. */
export async function apiSignIn(
	request: APIRequestContext,
	account: Account,
	deviceName = 'Test device'
): Promise<string> {
	const response = await request.post('/api/v1/auth/login', {
		data: { ...account, deviceName }
	});
	expect(response.status()).toBe(200);
	const body = (await response.json()) as { token: string };
	return body.token;
}

export function bearer(token: string): { authorization: string } {
	return { authorization: `Bearer ${token}` };
}

/** Creates a regular account through the API, as the administrator. */
export async function createAccount(request: APIRequestContext): Promise<Account> {
	const token = await apiSignIn(request, admin);
	const account = { username: uniqueUsername(), password: 'user-password-1' };
	const response = await request.post('/api/v1/accounts', {
		headers: bearer(token),
		data: account
	});
	expect(response.status()).toBe(201);
	return account;
}
