import type { Page } from '@playwright/test';

const pixel = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
	'base64'
);

/** Answers the requests for article pictures locally, so that tests never reach the real host. */
export async function stubJournalImages(page: Page): Promise<void> {
	await page.route('https://a.ltrbxd.com/**', (route) =>
		route.fulfill({ contentType: 'image/png', body: pixel })
	);
}
