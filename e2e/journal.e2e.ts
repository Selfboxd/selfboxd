import { expect, test } from '@playwright/test';
import { createAccount, signIn } from './support/accounts';
import { stubJournalImages } from './support/journal/images';

test.describe('journal', () => {
	test.beforeEach(async ({ page, request }) => {
		await stubJournalImages(page);
		await signIn(page, await createAccount(request));
	});

	test('leads with the latest article and lists the following ones', async ({ page }) => {
		await page.goto('/journal');

		const lead = page.getByRole('article').first();
		await expect(lead.getByRole('heading', { level: 2 })).toHaveText('Lead Story.');
		await expect(lead).toContainText('With The New Film in theaters');
		await expect(lead.locator('em')).toHaveText('The New Film');
		await expect(lead.locator('img')).toHaveAttribute(
			'src',
			'https://a.ltrbxd.com/resized/lead-story.jpg?k=1'
		);
		await expect(page.getByRole('heading', { name: 'Interview 1.' }).first()).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Community 1.' }).first()).toBeVisible();
	});

	test('opens articles on their original site in a new tab, without referrer', async ({ page }) => {
		await page.goto('/journal');

		const link = page.getByRole('article').first().getByRole('link');
		await expect(link).toHaveAttribute('href', 'https://letterboxd.com/journal/lead-story/');
		await expect(link).toHaveAttribute('target', '_blank');
		await expect(link).toHaveAttribute('rel', /noopener/);
		await expect(link).toHaveAttribute('rel', /noreferrer/);
	});

	test('filters by section and lists every article in the archive', async ({ page }) => {
		await page.goto('/journal');
		await page.waitForLoadState('networkidle');
		const sections = page.getByRole('navigation', { name: 'Sections' });
		await sections.getByText('Sections', { exact: true }).click();
		await sections.getByRole('link', { name: 'Community' }).click();

		await expect(page).toHaveURL('/journal?section=Community');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Community');
		await expect(page.getByRole('article')).toHaveCount(3);

		await sections.getByText('Sections', { exact: true }).click();
		await sections.getByRole('link', { name: 'All sections' }).click();
		await expect(page.getByRole('article')).toHaveCount(9);
	});

	test('shows the whole archive for a section that does not exist', async ({ page }) => {
		await page.goto('/journal?section=%3Cscript%3E');

		await expect(page.getByRole('heading', { level: 1 })).toHaveText('All sections');
		await expect(page.getByRole('article')).toHaveCount(9);
	});

	test('renders feed content as text and drops unsafe links', async ({ page }) => {
		let dialogs = 0;
		page.on('dialog', () => (dialogs += 1));

		await page.goto('/journal?section=Shelf%20Life');

		await expect(page.getByRole('article')).toHaveCount(1);
		await expect(page.getByRole('heading', { name: 'Tom & Jerry alert(1).' })).toBeVisible();
		await expect(page.getByText('Unsafe Link')).toBeHidden();
		await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
		expect(dialogs).toBe(0);
	});

	test('credits the source of the articles', async ({ page }) => {
		await page.goto('/journal');

		await expect(page.getByText('Articles from the Letterboxd Journal')).toBeVisible();
	});

	test('requires an account', async ({ browser }) => {
		const context = await browser.newContext();
		const page = await context.newPage();

		await page.goto('/journal');

		await expect(page).toHaveURL(/\/login/);
		await context.close();
	});
});
