import type { Page } from '@playwright/test';

const pixel = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
	'base64'
);

/** Answers the requests for TMDB pictures with a blank picture, as the image host would. */
export async function stubTmdbImages(page: Page): Promise<void> {
	await page.route('**/tmdb-images/**', (route) =>
		route.fulfill({ contentType: 'image/png', body: pixel })
	);
}
