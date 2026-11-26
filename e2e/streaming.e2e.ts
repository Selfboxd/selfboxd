import { expect, test, type Page } from '@playwright/test';
import { chooseOption, createAccount, signIn } from './support/accounts';

async function chooseServices(page: Page, names: string[]) {
	await page.goto('/settings/streaming');
	const services = page.getByRole('main').locator('form', { hasText: 'Save' }).last();
	for (const name of names) await services.getByText(name, { exact: true }).click();
	await services.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('status')).toHaveText('Your preferences have been saved.');
}

async function choose(page: Page, menu: string, option: string) {
	const trigger = page.getByRole('main').getByRole('button', { name: menu, exact: true });
	await trigger.hover();
	await trigger.locator('xpath=..').getByRole('link', { name: option, exact: true }).click();
}

function posters(page: Page) {
	return page.locator('main ul.grid a[title]');
}

test.describe('streaming settings', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	test('chooses a country and the services used there', async ({ page }) => {
		await page.goto('/settings');
		await page.getByRole('link', { name: 'Streaming' }).click();
		await expect(page).toHaveURL('/settings/streaming');
		await expect(page.getByText('Netflix', { exact: true })).toBeVisible();

		await chooseOption(page.getByRole('main'), 'Your country', 'France');
		await page.getByRole('button', { name: 'Save' }).first().click();
		await expect(page.getByText('Canal+', { exact: true })).toBeVisible();
		await expect(page.getByText('Netflix', { exact: true })).toHaveCount(0);

		await chooseOption(page.getByRole('main'), 'Your country', 'United States of America');
		await page.getByRole('button', { name: 'Save' }).first().click();
		await expect(page.getByText('Netflix', { exact: true })).toBeVisible();

		await chooseServices(page, ['Netflix']);
		await page.reload();
		await expect(page.getByRole('checkbox', { name: 'Netflix' })).toBeChecked();
		await expect(page.getByRole('checkbox', { name: 'Mubi' })).not.toBeChecked();
	});

	test('offers no service menu until services are chosen', async ({ page }) => {
		await page.goto('/films/browse');
		await expect(page.getByRole('main').getByRole('button', { name: 'Service' })).toHaveCount(0);
	});

	test('narrows browsing, people and the diary to a service', async ({ page }) => {
		await chooseServices(page, ['Netflix', 'Mubi']);

		await page.goto('/films/browse');
		await choose(page, 'Service', 'Netflix');
		await expect(page).toHaveURL('/films/browse?service=8');
		await expect(posters(page)).toHaveCount(1);
		await expect(posters(page).first()).toHaveAttribute('href', '/film/78');

		await page.goto('/person/578');
		await choose(page, 'Service', 'Mubi');
		await expect(page).toHaveURL('/person/578?service=11');
		await expect(posters(page)).toHaveCount(1);
		await expect(posters(page).first()).toHaveAttribute('href', '/film/335984');

		for (const id of [78, 335984]) {
			await page.goto(`/film/${String(id)}`);
			const actions = page.getByRole('region', { name: 'Your actions' });
			await actions.getByRole('button', { name: /Review or log|Log again/ }).click();
			await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
			await expect(page.getByRole('dialog')).toBeHidden();
		}
		await page.goto('/diary');
		await choose(page, 'Service', 'Netflix');
		await expect(page).toHaveURL('/diary?service=8');
		await expect(page.locator('main tbody tr')).toHaveCount(1);
		await expect(page.locator('main tbody tr').first()).not.toContainText('2049');
	});

	test('ignores a service the account does not use', async ({ page }) => {
		await page.goto('/films/browse?service=8');
		await expect(posters(page)).toHaveCount(3);
	});
});
