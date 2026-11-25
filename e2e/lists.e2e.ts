import { expect, test, type Page } from '@playwright/test';
import { createAccount, signIn } from './support/accounts';

async function createList(page: Page, name: string, ranked = false): Promise<string> {
	await page.goto('/profile/lists/new');
	await page.getByLabel('Name', { exact: true }).fill(name);
	if (ranked) await page.getByLabel('Ranked list').check();
	await page.getByRole('main').getByRole('button', { name: 'Save' }).click();
	await expect(page).toHaveURL(/\/profile\/lists\/\d+$/);
	return new URL(page.url()).pathname;
}

async function addFilm(page: Page, film: number, list: string) {
	await page.goto(`/film/${String(film)}`);
	await page.getByRole('button', { name: 'Add film to lists…' }).click();
	const dialog = page.getByRole('dialog', { name: 'Add to lists' });
	await dialog.getByLabel(list).check();
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dialog).toBeHidden();
}

test.describe('lists', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	test('starts empty and creates a list with a description', async ({ page }) => {
		await page.goto('/profile/lists');
		await expect(page.getByRole('main').getByText('You have no list yet.')).toBeVisible();

		await page.getByRole('main').getByRole('link', { name: 'Start a new list…' }).click();
		await page.getByLabel('Name', { exact: true }).fill('Rainy nights');
		await page.getByLabel('Description').fill('Neon and rain.');
		await page.getByRole('main').getByRole('button', { name: 'Save' }).click();

		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rainy nights');
		await expect(page.getByText('Neon and rain.')).toBeVisible();
		await expect(page.getByText('This list has no film yet.')).toBeVisible();
		await page.goto('/profile/lists');
		await expect(page.getByRole('link', { name: 'Rainy nights' })).toBeVisible();
	});

	test('requires a name', async ({ page, baseURL }) => {
		const response = await page.request.post('/profile/lists/new', {
			headers: { origin: baseURL ?? '' },
			form: { name: '   ' }
		});

		expect(await response.text()).toContain('list_name_required');
		await page.goto('/profile/lists');
		await expect(page.getByRole('main').getByText('You have no list yet.')).toBeVisible();
	});

	test('adds films from their page and shows them ranked', async ({ page }) => {
		const path = await createList(page, 'Ranked', true);
		await addFilm(page, 78, 'Ranked');
		await addFilm(page, 335984, 'Ranked');

		await page.goto(path);

		const items = page.getByRole('main').getByRole('listitem');
		await expect(items).toHaveCount(2);
		await expect(items.nth(0).getByRole('link')).toHaveAttribute('href', '/film/78');
		await expect(items.nth(0)).toContainText('1');
		await expect(items.nth(1).getByRole('link')).toHaveAttribute('href', '/film/335984');
		await expect(page.getByText('Films: 2')).toBeVisible();
	});

	test('remembers the lists of a film and removes it when unchecked', async ({ page }) => {
		const path = await createList(page, 'Keepers');
		await addFilm(page, 78, 'Keepers');

		await page.getByRole('button', { name: 'Add film to lists…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Add to lists' });
		await expect(dialog.getByLabel('Keepers')).toBeChecked();
		await dialog.getByLabel('Keepers').uncheck();
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toBeHidden();

		await page.goto(path);
		await expect(page.getByText('This list has no film yet.')).toBeVisible();
	});

	test('reorders films by dragging them', async ({ page }) => {
		const path = await createList(page, 'Ordered', true);
		await addFilm(page, 78, 'Ordered');
		await addFilm(page, 335984, 'Ordered');
		await page.goto(`${path}/edit`);
		const rows = page.getByRole('main').getByRole('listitem');
		await expect(page.getByText('Drag films to reorder them.')).toBeVisible();

		const saved = page.waitForResponse((response) => response.url().includes('?/reorder'));
		await rows.nth(1).dragTo(rows.nth(0));
		await saved;

		await expect(rows.nth(0)).toContainText('Blade Runner 2049');
		await page.goto(path);
		const items = page.getByRole('main').getByRole('listitem');
		await expect(items.nth(0).getByRole('link')).toHaveAttribute('href', '/film/335984');
		await expect(items.nth(1).getByRole('link')).toHaveAttribute('href', '/film/78');
	});

	test('reorders films with the arrow keys', async ({ page }) => {
		const path = await createList(page, 'Keyboard');
		await addFilm(page, 78, 'Keyboard');
		await addFilm(page, 335984, 'Keyboard');
		await page.goto(`${path}/edit`);

		const saved = page.waitForResponse((response) => response.url().includes('?/reorder'));
		await page
			.getByRole('button', { name: 'Reorder Blade Runner', exact: true })
			.press('ArrowDown');
		await saved;

		await page.reload();
		const rows = page.getByRole('main').getByRole('listitem');
		await expect(rows.nth(0)).toContainText('Blade Runner 2049');
		await expect(rows.nth(1)).toContainText('Blade Runner');
	});

	test('annotates and removes films while editing', async ({ page }) => {
		const path = await createList(page, 'Notes');
		await addFilm(page, 78, 'Notes');
		await addFilm(page, 335984, 'Notes');
		await page.goto(`${path}/edit`);
		const rows = page.getByRole('main').getByRole('listitem');

		const saved = page.waitForResponse((response) => response.url().includes('?/note'));
		await page.getByLabel('Note for Blade Runner 2049').fill('Better than the first.');
		await page.getByLabel('Note for Blade Runner 2049').press('Enter');
		await saved;
		await rows.nth(0).hover();
		await page.getByRole('button', { name: 'Remove Blade Runner', exact: true }).click();
		await expect(rows).toHaveCount(1);

		await page.goto(path);
		await expect(page.getByText('Better than the first.')).toBeVisible();
		await expect(page.locator('a[href="/film/78"]')).toHaveCount(0);
	});

	test('refuses a forged order', async ({ page, baseURL }) => {
		const path = await createList(page, 'Forged');
		await addFilm(page, 78, 'Forged');
		const headers = { origin: baseURL ?? '' };

		for (const order of ['', '999999', '1,1', 'abc', '1;DROP TABLE lists']) {
			const response = await page.request.post(`${path}/edit?/reorder`, {
				headers,
				form: { order }
			});
			expect(await response.text()).toContain('list_not_found');
		}
		await page.goto(path);
		await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(1);
	});

	test('renames a list and deletes it', async ({ page }) => {
		const path = await createList(page, 'Draft');
		await page.goto(`${path}/edit`);

		await page.getByLabel('Name', { exact: true }).fill('Final');
		await page.getByRole('complementary').getByRole('button', { name: 'Save' }).click();
		await expect(page.getByRole('status')).toHaveText('The list has been saved.');

		page.on('dialog', (confirmation) => void confirmation.accept());
		await page.getByRole('button', { name: 'Delete list' }).click();
		await expect(page).toHaveURL('/profile/lists');
		await expect(page.getByRole('main').getByText('You have no list yet.')).toBeVisible();
	});

	test('renders the name and description as text, never as markup', async ({ page }) => {
		let dialogs = 0;
		page.on('dialog', () => (dialogs += 1));
		await page.goto('/profile/lists/new');
		await page.getByLabel('Name', { exact: true }).fill('<img src=x onerror=alert(1)>');
		await page.getByLabel('Description').fill('<script>alert(2)</script>');
		await page.getByRole('main').getByRole('button', { name: 'Save' }).click();

		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			'<img src=x onerror=alert(1)>'
		);
		await page.goto('/profile/lists');
		await expect(page.getByText('<script>alert(2)</script>')).toBeVisible();
		expect(dialogs).toBe(0);
	});

	test('starts a list from the menu of the log button', async ({ page }) => {
		await page.getByRole('button', { name: 'More ways to add' }).click();
		await page.getByRole('banner').getByRole('link', { name: 'Start a new list…' }).click();

		await expect(page).toHaveURL('/profile/lists/new');
	});
});

test.describe('list privacy', () => {
	test('hides and protects the lists of another account', async ({ page, request, baseURL }) => {
		await signIn(page, await createAccount(request));
		const path = await createList(page, 'Private');
		await addFilm(page, 78, 'Private');
		const id = path.split('/').at(-1) ?? '';
		const cookies = await page.context().cookies();

		await page.context().clearCookies();
		await signIn(page, await createAccount(request));
		const headers = { origin: baseURL ?? '' };
		expect((await page.goto(path))?.status()).toBe(404);
		expect((await page.goto(`${path}/edit`))?.status()).toBe(404);
		await page.request.post(`${path}/edit?/save`, { headers, form: { name: 'Hijacked' } });
		await page.request.post(`${path}/edit?/delete`, { headers });
		await page.request.post('/film/335984?/lists', { headers, form: { listId: id } });
		await page.goto('/film/78');
		await page.getByRole('button', { name: 'Add film to lists…' }).click();
		await expect(page.getByRole('dialog').getByText('You have no list yet.')).toBeVisible();

		await page.context().clearCookies();
		await page.context().addCookies(cookies);
		await page.goto(path);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Private');
		await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(1);
	});

	test('answers 404 for an identifier that is not a number', async ({ page, request }) => {
		await signIn(page, await createAccount(request));

		expect((await page.goto('/profile/lists/abc'))?.status()).toBe(404);
		expect((await page.goto('/profile/lists/0/edit'))?.status()).toBe(404);
	});
});
