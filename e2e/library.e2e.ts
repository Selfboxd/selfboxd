import { expect, test, type Page } from '@playwright/test';
import { createAccount, signIn, chooseOption } from './support/accounts';
import { fillTags, pickDate } from './support/fields';

function actions(page: Page) {
	return page.getByRole('region', { name: 'Your actions' });
}

async function openFilm(page: Page, id = 78) {
	await page.goto(`/film/${String(id)}`);
	await expect(actions(page)).toBeVisible();
}

/** Opens the log dialog of the current film page and returns it. */
async function openLog(page: Page) {
	await actions(page)
		.getByRole('button', { name: /Review or log|Log again/ })
		.click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	return dialog;
}

test.describe('film actions', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	test('marks a film as watched without adding it to the diary', async ({ page }) => {
		await openFilm(page);

		await actions(page).getByRole('button', { name: 'Watch', exact: true }).click();

		await expect(actions(page).getByRole('button', { name: 'Watched' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await page.goto('/diary');
		await expect(page.getByText('Your diary is empty.')).toBeVisible();
	});

	test('marks a watched film as not watched again', async ({ page }) => {
		await openFilm(page);
		await actions(page).getByRole('button', { name: 'Watch', exact: true }).click();

		await actions(page).getByRole('button', { name: 'Watched' }).click();

		await expect(actions(page).getByRole('button', { name: 'Watch', exact: true })).toBeVisible();
	});

	test('likes a film independently of its watched status', async ({ page }) => {
		await openFilm(page);

		await actions(page).getByRole('button', { name: 'Like', exact: true }).click();

		await expect(actions(page).getByRole('button', { name: 'Liked' })).toBeVisible();
		await expect(actions(page).getByRole('button', { name: 'Watch', exact: true })).toBeVisible();
	});

	test('rates a film by half stars, which marks it as watched', async ({ page }) => {
		await openFilm(page);

		await actions(page).getByRole('button', { name: '3.5 out of 5 stars', exact: true }).click();

		await expect(actions(page).getByText('Rated')).toBeVisible();
		await expect(
			actions(page).getByRole('button', { name: '3.5 out of 5 stars', exact: true })
		).toHaveAttribute('aria-pressed', 'true');
		await expect(actions(page).getByRole('button', { name: 'Watched' })).toBeVisible();
	});

	test('removes a rating by choosing it again', async ({ page }) => {
		await openFilm(page);
		await actions(page).getByRole('button', { name: '4 out of 5 stars', exact: true }).click();
		await expect(actions(page).getByText('Rated')).toBeVisible();

		await actions(page).getByRole('button', { name: '4 out of 5 stars', exact: true }).click();

		await expect(actions(page).getByText('Rate', { exact: true })).toBeVisible();
	});

	test('keeps the state after a reload and separate for each film', async ({ page }) => {
		await openFilm(page);
		await actions(page).getByRole('button', { name: 'Like', exact: true }).click();
		await expect(actions(page).getByRole('button', { name: 'Liked' })).toBeVisible();

		await page.reload();
		await expect(actions(page).getByRole('button', { name: 'Liked' })).toBeVisible();

		await openFilm(page, 335984);
		await expect(actions(page).getByRole('button', { name: 'Like', exact: true })).toBeVisible();
	});
});

test.describe('watchlist', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	async function addToWatchlist(page: Page, id: number, note = '', tags = '') {
		await openFilm(page, id);
		await actions(page).getByRole('button', { name: 'Watchlist', exact: true }).click();
		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Note').fill(note);
		await fillTags(dialog, 'Tags', tags);
		await dialog.getByRole('button', { name: 'Add' }).click();
		await expect(dialog).toBeHidden();
	}

	test('adds a film with a note and tags, newest first', async ({ page }) => {
		await addToWatchlist(page, 78, 'A classic I never saw', 'Sci-Fi, classics');
		await addToWatchlist(page, 335984, '', 'sci-fi');

		await page.goto('/watchlist');

		await expect(page.getByRole('heading', { name: 'You want to see 2 titles' })).toBeVisible();
		const items = page.locator('main ul.items > li');
		await expect(items.nth(0).getByRole('link').first()).toHaveAttribute('href', '/film/335984');
		await expect(items.nth(1).getByRole('link').first()).toHaveAttribute('href', '/film/78');
		await expect(items.nth(1)).toHaveAttribute('title', 'A classic I never saw');
	});

	test('filters by tag', async ({ page }) => {
		await addToWatchlist(page, 78, '', 'classics');
		await addToWatchlist(page, 335984, '', 'recent');

		await page.goto('/watchlist');
		const bar = page.getByRole('main').locator('.head');
		await bar.getByRole('button', { name: 'Tag' }).hover();
		await bar.getByRole('link', { name: 'classics', exact: true }).click();

		await expect(page).toHaveURL('/watchlist?tag=classics');
		await expect(page.locator('a[href="/film/78"]')).toBeVisible();
		await expect(page.locator('a[href="/film/335984"]')).toBeHidden();
	});

	test('ignores a tag that does not exist', async ({ page }) => {
		await addToWatchlist(page, 78, '', 'classics');

		await page.goto('/watchlist?tag=%3Cscript%3E');

		await expect(page.locator('a[href="/film/78"]')).toBeVisible();
	});

	test('removes a film from the film page and from the watchlist page', async ({ page }) => {
		await addToWatchlist(page, 78);
		await addToWatchlist(page, 335984);

		await actions(page).getByRole('button', { name: 'Watchlist', exact: true }).click();
		await expect(
			actions(page).getByRole('button', { name: 'Watchlist', exact: true })
		).toHaveAttribute('aria-pressed', 'false');

		await page.goto('/watchlist');
		await page.getByRole('button', { name: 'Remove from watchlist: Blade Runner' }).click();
		await expect(page.getByText('Your watchlist is empty.')).toBeVisible();
	});

	test('drops a film once it is marked as watched, and takes it back afterwards', async ({
		page
	}) => {
		await addToWatchlist(page, 78);

		await actions(page).getByRole('button', { name: 'Watch', exact: true }).click();
		await expect(
			actions(page).getByRole('button', { name: 'Watchlist', exact: true })
		).toHaveAttribute('aria-pressed', 'false');

		await addToWatchlist(page, 78);
		await expect(actions(page).getByRole('button', { name: 'Watched' })).toBeVisible();
		await page.goto('/watchlist');
		await expect(page.locator('a[href="/film/78"]')).toBeVisible();
	});

	test('edits the note of a listed film', async ({ page }) => {
		await addToWatchlist(page, 78, 'First note');

		await actions(page).getByRole('button', { name: 'Edit watchlist note…' }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByLabel('Note')).toHaveValue('First note');
		await dialog.getByLabel('Note').fill('Second note');
		await dialog.getByRole('button', { name: 'Save' }).first().click();
		await expect(dialog).toBeHidden();

		await page.goto('/watchlist');
		await expect(page.locator('main ul.items > li').first()).toHaveAttribute(
			'title',
			'Second note'
		);
	});

	test('narrows by kind, sorts, and adds a title from the search', async ({ page }) => {
		await addToWatchlist(page, 78);
		await page.goto('/watchlist');

		await page.getByRole('button', { name: 'Search title…' }).click();
		const search = page.getByRole('dialog', { name: 'Add to your watchlist' });
		await search.getByLabel('Name of the film or series').fill('neon');
		await search.getByRole('button', { name: /Neon Precinct/ }).click();
		await expect(page.getByRole('status')).toHaveText('Neon Precinct is on your watchlist.');
		await expect(page.getByRole('heading', { name: 'You want to see 2 titles' })).toBeVisible();

		const bar = page.getByRole('main').locator('.head');
		await bar.getByRole('button', { name: 'Type' }).hover();
		await bar.getByRole('link', { name: 'Series', exact: true }).click();
		await expect(page).toHaveURL('/watchlist?kind=series');
		await expect(page.locator('main a[href="/series/1400"]').first()).toBeVisible();
		await expect(page.locator('main a[href="/film/78"]')).toHaveCount(0);
	});

	test('exports and clears the watchlist', async ({ page }) => {
		await addToWatchlist(page, 78, 'Why not', 'classics');
		await page.goto('/watchlist');
		const panel = page.getByRole('complementary');

		const download = page.waitForEvent('download');
		await panel.getByRole('link', { name: 'Export watchlist' }).click();
		const file = await (await download).path();
		const csv = (await import('node:fs')).readFileSync(file, 'utf8');
		expect(csv).toContain('Date,Name,Year,Type,TMDB ID,Note,Tags');
		expect(csv).toContain(',Blade Runner,1982,film,78,Why not,classics');

		await expect(panel.getByRole('button', { name: 'Make private' })).toHaveCount(0);

		await panel.getByRole('button', { name: 'Clear watchlist' }).click();
		await expect(panel.getByText('Remove all 1 titles from your watchlist?')).toBeVisible();
		await panel.getByRole('button', { name: 'Clear watchlist' }).click();
		await expect(page.getByText('Your watchlist is empty.')).toBeVisible();
	});
});

test.describe('diary', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	test('shows a heart for a film liked outside its entry', async ({ page }) => {
		await openFilm(page);
		const dialog = await openLog(page);
		await dialog.getByRole('button', { name: 'Save' }).first().click();
		await expect(dialog).toBeHidden();
		await page.goto('/diary');
		const row = page.getByRole('row').filter({ hasText: 'Blade Runner' });
		await expect(row.getByRole('img', { name: 'Liked' })).toHaveCount(0);

		await openFilm(page);
		await actions(page).getByRole('button', { name: 'Like', exact: true }).click();
		await expect(actions(page).getByRole('button', { name: 'Liked' })).toBeVisible();
		await page.goto('/diary');
		await expect(row.getByRole('img', { name: 'Liked' })).toBeVisible();
	});

	test('logs a film with a date, rating, like, review and tags', async ({ page }) => {
		await openFilm(page);
		const dialog = await openLog(page);
		await expect(dialog.getByRole('heading', { name: 'I watched…' })).toBeVisible();
		await expect(dialog.getByText('Blade Runner')).toBeVisible();

		await pickDate(dialog, 'Watched on', '2026-03-14');
		await dialog.getByRole('button', { name: '4.5 out of 5 stars', exact: true }).click();
		await dialog.getByText('Like', { exact: true }).click();
		await dialog.getByLabel('Review').fill('Tears in rain.\n\nStill unmatched.');
		await fillTags(dialog, 'Tags', 'Cinema, 35mm');
		await dialog.getByRole('button', { name: 'Save' }).first().click();
		await expect(dialog).toBeHidden();

		await expect(actions(page).getByRole('button', { name: 'Logged' })).toBeVisible();
		await expect(actions(page).getByRole('button', { name: 'Liked' })).toBeVisible();
		const activity = page.locator('section', { hasText: 'Your activity' }).last();
		await expect(activity.getByText('Watched Mar 14, 2026')).toBeVisible();
		await expect(activity.getByText('Tears in rain.')).toBeVisible();
		await expect(activity.getByText('35mm')).toBeVisible();
		await expect(activity.getByRole('img', { name: '4.5 out of 5 stars' })).toBeVisible();

		await page.goto('/diary');
		const row = page.getByRole('row').filter({ hasText: 'Blade Runner' });
		await expect(row.getByText('Mar 2026')).toBeVisible();
		await expect(row.getByRole('cell', { name: '14', exact: true })).toBeVisible();
		await expect(row.getByText('1982')).toBeVisible();
		await expect(row.getByRole('img', { name: '4.5 out of 5 stars' })).toBeVisible();
		await expect(row.getByRole('img', { name: 'Liked' })).toBeVisible();
		await expect(row.getByRole('img', { name: 'Review' })).toBeVisible();
		await expect(row.getByRole('img', { name: 'Rewatch' })).toBeHidden();
	});

	test('defaults to today and offers a rewatch for a film already watched', async ({ page }) => {
		await openFilm(page);
		await actions(page).getByRole('button', { name: 'Watch', exact: true }).click();
		await expect(actions(page).getByRole('button', { name: 'Watched' })).toBeVisible();

		const dialog = await openLog(page);

		const today = await page.evaluate(() => {
			const now = new Date();
			return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
		});
		await expect(dialog.locator('input[name="watchedOn"]')).toHaveValue(today);
		await expect(dialog.getByLabel('I’ve watched this before')).toBeChecked();
	});

	test('lists the most recent viewing first and marks rewatches', async ({ page }) => {
		await openFilm(page);
		let dialog = await openLog(page);
		await pickDate(dialog, 'Watched on', '2025-12-30');
		await dialog.getByRole('button', { name: 'Save' }).first().click();
		await expect(dialog).toBeHidden();
		dialog = await openLog(page);
		await pickDate(dialog, 'Watched on', '2026-01-02');
		await dialog.getByRole('button', { name: 'Save' }).first().click();
		await expect(dialog).toBeHidden();

		await page.goto('/diary');

		const rows = page.getByRole('row').filter({ hasText: 'Blade Runner' });
		await expect(rows).toHaveCount(2);
		await expect(rows.nth(0).getByText('Jan 2026')).toBeVisible();
		await expect(rows.nth(0).getByRole('img', { name: 'Rewatch' })).toBeVisible();
		await expect(rows.nth(1).getByText('Dec 2025')).toBeVisible();
	});

	test('filters and sorts the diary from the menus of its header', async ({ page }) => {
		await openFilm(page);
		let dialog = await openLog(page);
		await pickDate(dialog, 'Watched on', '2025-12-30');
		await dialog.getByRole('button', { name: '4.5 out of 5 stars', exact: true }).click();
		await dialog.getByRole('button', { name: 'Save' }).first().click();
		await expect(dialog).toBeHidden();
		await openFilm(page, 335984);
		dialog = await openLog(page);
		await pickDate(dialog, 'Watched on', '2026-01-02');
		await dialog.getByRole('button', { name: 'Save' }).first().click();
		await expect(dialog).toBeHidden();

		await page.goto('/diary');
		const head = page.getByRole('main').locator('header.head');
		const rows = page.locator('main tbody tr');
		const choose = async (menu: string | RegExp, option: string) => {
			await head.getByRole('button', { name: menu }).hover();
			await head.getByRole('link', { name: option, exact: true }).click();
		};
		await expect(rows).toHaveCount(2);
		await expect(rows.first()).toContainText('Blade Runner 2049');

		await choose('Diary year', '2025');
		await expect(page).toHaveURL('/diary?year=2025');
		await expect(rows).toHaveCount(1);
		await expect(rows.first()).toContainText('Blade Runner');

		await choose('2025', 'Any year');
		await expect(page).toHaveURL('/diary');
		await page.mouse.move(0, 0);
		await choose('Rating', 'Not rated');
		await expect(page).toHaveURL('/diary?rating=none');
		await expect(rows).toHaveCount(1);
		await expect(rows.first()).toContainText('Blade Runner 2049');

		await choose('Not rated', 'Any rating');
		await expect(page).toHaveURL('/diary');
		await page.mouse.move(0, 0);
		await choose(/^Sort by/, 'Earliest watched');
		await expect(page).toHaveURL('/diary?sort=watched_oldest');
		await expect(rows.first()).not.toContainText('2049');

		await page.mouse.move(0, 0);
		await choose('Decade', '2010s');
		await expect(rows).toHaveCount(1);
		await expect(rows.first()).toContainText('Blade Runner 2049');

		await page.goto('/diary?show=reviews');
		await expect(page.getByText('No entry matches these filters.')).toBeVisible();
	});

	test('groups the activity by day, newest first', async ({ page }) => {
		await openFilm(page);
		await actions(page).getByRole('button', { name: 'Like', exact: true }).click();
		await expect(actions(page).getByRole('button', { name: 'Liked' })).toBeVisible();

		await page.goto('/activity');
		const today = page.getByRole('region', { name: 'Today' });
		await expect(today).toBeVisible();
		await expect(today.getByRole('listitem').first()).toContainText('You liked Blade Runner');
		await expect(today.getByRole('listitem').first().locator('time')).toHaveText(/\d{2}:\d{2}/);
	});

	test('turns tags into chips and completes the tags already used', async ({ page }) => {
		await openFilm(page);
		let dialog = await openLog(page);
		await fillTags(dialog, 'Tags', 'Cinema, 35mm');
		await expect(dialog.getByRole('button', { name: 'Remove the cinema tag' })).toBeVisible();
		await dialog.getByRole('button', { name: 'Save' }).first().click();
		await expect(dialog).toBeHidden();

		dialog = await openLog(page);
		const field = dialog.getByLabel('Tags', { exact: true });
		await field.fill('cin');
		await expect(dialog.getByRole('option', { name: 'cinema' })).toBeVisible();
		await field.press('Tab');
		await field.fill('home');
		await field.press('Enter');
		await field.press('Backspace');
		await expect(dialog.getByRole('button', { name: 'Remove the home tag' })).toBeHidden();
		await field.fill('friends,');
		await dialog.getByRole('button', { name: 'Remove the cinema tag' }).click();
		await expect(dialog.locator('input[name="tags"]')).toHaveValue('friends');
	});

	test('offers no day in the future', async ({ page }) => {
		await openFilm(page);
		const dialog = await openLog(page);

		await dialog.getByLabel('Watched on', { exact: true }).click();
		const calendar = dialog.getByRole('dialog', { name: 'Choose a date' });
		await expect(calendar.locator('[aria-current="date"]')).toBeEnabled();
		await calendar.getByRole('button', { name: 'Next month' }).click();
		const days = calendar.getByRole('gridcell').getByRole('button');
		await expect(days.first()).toBeDisabled();
		await expect(days.last()).toBeDisabled();

		await calendar.getByRole('button', { name: 'Previous month' }).click();
		await calendar.getByRole('button', { name: 'Previous month' }).click();
		await days.first().click();
		await expect(calendar).toBeHidden();
	});

	test('hides a review with spoilers until it is asked for', async ({ page }) => {
		await openFilm(page);
		const dialog = await openLog(page);
		await dialog.getByLabel('Review').fill('Deckard is a replicant.');
		await dialog.getByLabel('Contains spoilers').check();
		await dialog.getByRole('button', { name: 'Save' }).first().click();
		await expect(dialog).toBeHidden();

		await expect(page.getByText('This review may contain spoilers.')).toBeVisible();
		await expect(page.getByText('Deckard is a replicant.')).toBeHidden();
		await page.getByRole('button', { name: 'Show the review' }).click();

		await expect(page.getByText('Deckard is a replicant.')).toBeVisible();
	});

	test('renders a review as text, never as markup', async ({ page }) => {
		let dialogs = 0;
		page.on('dialog', () => (dialogs += 1));
		await openFilm(page);
		const dialog = await openLog(page);

		await dialog.getByLabel('Review').fill('<img src=x onerror=alert(1)>');
		await dialog.getByRole('button', { name: 'Save' }).first().click();
		await expect(dialog).toBeHidden();

		await expect(page.getByText('<img src=x onerror=alert(1)>')).toBeVisible();
		expect(dialogs).toBe(0);
	});

	test('edits an entry from the diary', async ({ page }) => {
		await openFilm(page);
		let dialog = await openLog(page);
		await pickDate(dialog, 'Watched on', '2026-02-01');
		await dialog.getByLabel('Review').fill('First impression.');
		await dialog.getByRole('button', { name: 'Save' }).first().click();
		await expect(dialog).toBeHidden();

		await page.goto('/diary');
		await page.getByRole('button', { name: 'Edit entry', exact: true }).click();
		dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Edit diary entry' })).toBeVisible();
		await expect(dialog.getByLabel('Review')).toHaveValue('First impression.');
		await pickDate(dialog, 'Watched on', '2026-02-03');
		await dialog.getByRole('button', { name: '5 out of 5 stars', exact: true }).click();
		await dialog.getByRole('button', { name: 'Save' }).first().click();
		await expect(dialog).toBeHidden();

		const row = page.getByRole('row').filter({ hasText: 'Blade Runner' });
		await expect(row.getByRole('cell', { name: '3', exact: true })).toBeVisible();
		await expect(row.getByRole('img', { name: '5 out of 5 stars' })).toBeVisible();
	});

	test('deletes an entry, which leaves the film watched', async ({ page }) => {
		await openFilm(page);
		const dialog = await openLog(page);
		await dialog.getByRole('button', { name: 'Save' }).first().click();
		await expect(dialog).toBeHidden();

		page.on('dialog', (confirmation) => void confirmation.accept());
		await page.getByRole('button', { name: 'Edit entry', exact: true }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

		await expect(page.getByRole('heading', { name: 'Your activity' })).toBeHidden();
		await expect(actions(page).getByRole('button', { name: 'Watched' })).toBeVisible();
	});

	test('keeps a logged film watched', async ({ page }) => {
		await openFilm(page);
		const dialog = await openLog(page);
		await dialog.getByRole('button', { name: 'Save' }).first().click();
		await expect(dialog).toBeHidden();

		await actions(page).getByRole('button', { name: 'Logged' }).click();

		await expect(page.getByRole('alert')).toContainText('This film is in your diary.');
		await expect(actions(page).getByRole('button', { name: 'Logged' })).toBeVisible();
	});
});

test.describe('rating scale', () => {
	test('switches every rating to a mark out of ten', async ({ page, request }) => {
		await signIn(page, await createAccount(request));
		await openFilm(page);
		await actions(page).getByRole('button', { name: '3.5 out of 5 stars', exact: true }).click();
		await expect(actions(page).getByText('Rated')).toBeVisible();

		await page.goto('/settings/preferences');
		await chooseOption(page, 'Rating scale', 'Mark out of 10');
		await page.getByRole('button', { name: 'Save' }).first().click();
		await expect(page.getByRole('status')).toHaveText('Your preferences have been saved.');

		await openFilm(page);
		await expect(actions(page).getByRole('button', { name: '7 out of 10' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await actions(page).getByRole('button', { name: '9 out of 10' }).click();
		await expect(actions(page).getByRole('button', { name: '9 out of 10' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});
});

test.describe('library privacy', () => {
	test('keeps the diary and watchlist of each account separate', async ({ page, request }) => {
		await signIn(page, await createAccount(request));
		await openFilm(page);
		const dialog = await openLog(page);
		await dialog.getByLabel('Review').fill('Private thoughts.');
		await dialog.getByRole('button', { name: 'Save' }).first().click();
		await expect(dialog).toBeHidden();

		await page.context().clearCookies();
		await signIn(page, await createAccount(request));

		await page.goto('/diary');
		await expect(page.getByText('Your diary is empty.')).toBeVisible();
		await openFilm(page);
		await expect(page.getByText('Private thoughts.')).toBeHidden();
		await expect(actions(page).getByRole('button', { name: 'Watch', exact: true })).toBeVisible();
	});

	test('does not let an account edit or delete the entry of another account', async ({
		page,
		request,
		baseURL
	}) => {
		await signIn(page, await createAccount(request));
		await openFilm(page);
		const dialog = await openLog(page);
		await dialog.getByLabel('Review').fill('Mine.');
		await dialog.getByRole('button', { name: 'Save' }).first().click();
		await expect(dialog).toBeHidden();
		await page.getByRole('button', { name: 'Edit entry', exact: true }).click();
		const id = await page.locator('dialog[open] input[name="entryId"]').first().inputValue();
		const cookies = await page.context().cookies();

		await page.context().clearCookies();
		await signIn(page, await createAccount(request));
		const headers = { origin: baseURL ?? '' };
		await page.request.post('/film/78?/log', {
			headers,
			form: { entryId: id, watchedOn: '2026-01-01', review: 'Hijacked.' }
		});
		await page.request.post('/film/78?/deleteEntry', { headers, form: { entryId: id } });

		await page.context().clearCookies();
		await page.context().addCookies(cookies);
		await page.goto('/film/78');
		await expect(page.getByText('Mine.')).toBeVisible();
	});

	test('rejects forged values', async ({ page, request, baseURL }) => {
		await signIn(page, await createAccount(request));
		const headers = { origin: baseURL ?? '' };

		const rating = await page.request.post('/film/78?/rate', { headers, form: { rating: '99' } });
		const date = await page.request.post('/film/78?/log', {
			headers,
			form: { watchedOn: 'yesterday' }
		});

		expect(await rating.text()).toContain('rating_invalid');
		expect(await date.text()).toContain('date_invalid');
		await openFilm(page);
		await expect(actions(page).getByRole('button', { name: 'Watch', exact: true })).toBeVisible();
	});
});
