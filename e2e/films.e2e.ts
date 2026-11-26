import { expect, test } from '@playwright/test';
import { admin, apiSignIn, bearer, createAccount, signIn } from './support/accounts';
import { tmdbRequestCount } from './support/tmdb/requests';

test.describe('search', () => {
	test('finds films from the header and opens their page', async ({ page, request }) => {
		await signIn(page, await createAccount(request));

		await page.getByRole('banner').getByRole('link', { name: 'Search' }).click();
		await page.getByRole('searchbox', { name: 'Search' }).fill('blade');
		await page.getByRole('searchbox', { name: 'Search' }).press('Enter');

		await expect(page).toHaveURL('/search?q=blade');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Showing matches for “blade”');
		await expect(page.getByRole('link', { name: 'Blade Runner 2049', exact: true })).toBeVisible();
		await expect(page.getByText('Directed by Ridley Scott').first()).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Show results for' })).toBeVisible();
		await page.getByRole('link', { name: 'Blade Runner', exact: true }).click();
		await expect(page).toHaveURL('/film/78');
	});

	test('shows films and series together by default, with their other titles', async ({
		page,
		request
	}) => {
		await signIn(page, await createAccount(request));
		await page.goto('/search?q=r');

		const filters = page.getByRole('complementary');
		await expect(filters.getByRole('link', { name: 'All' })).toHaveAttribute(
			'aria-current',
			'true'
		);
		const results = page.locator('main ul.results > li');
		await expect(results).toHaveCount(4);
		await expect(results.nth(0)).toContainText('Neon Precinct');
		await expect(results.nth(0)).toContainText('Created by Ada Rivers');
		await expect(results.nth(0)).toContainText('Alternative titles: Precinto de Neón');
		await expect(results.nth(1)).toContainText('Harbour Lights');
		await expect(results.nth(2)).toContainText('Blade Runner');
		await expect(results.nth(2)).toContainText(
			'Alternative titles: Der Blade Runner, ブレードランナー'
		);

		await filters.getByRole('link', { name: 'Films' }).click();
		await expect(page).toHaveURL('/search?q=r&type=films');
		await expect(page.getByRole('link', { name: 'Neon Precinct', exact: true })).toHaveCount(0);
	});

	test('pages through long result lists', async ({ page, request }) => {
		await signIn(page, await createAccount(request));

		await page.goto('/search?q=many');
		await expect(page.getByRole('link', { name: 'Many 1', exact: true })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Many 2', exact: true })).toBeVisible();
		await expect(page.locator('main ul.results > li')).toHaveCount(2);
		await expect(page.getByRole('button', { name: 'Show more' })).toHaveCount(0);
		await expect(page).toHaveURL('/search?q=many');
	});

	test('says when nothing matches', async ({ page, request }) => {
		await signIn(page, await createAccount(request));

		await page.goto('/search?q=zzzz');

		await expect(page.getByText('No films match this search.')).toBeVisible();
	});

	test('asks for a title when the query is empty', async ({ page, request }) => {
		await signIn(page, await createAccount(request));

		await page.goto('/search');

		await expect(page.getByText('Search for a film by its title.')).toBeVisible();
	});
});

test.describe('film page', () => {
	test.beforeEach(async ({ page, request }) => {
		await signIn(page, await createAccount(request));
	});

	test('shows the header, the presentation and the ratings', async ({ page }) => {
		await page.goto('/film/78');

		await expect(page).toHaveTitle('Blade Runner - Selfboxd');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Blade Runner');
		await expect(page.getByText('1982')).toBeVisible();
		await expect(page.getByText('Directed by Ridley Scott')).toBeVisible();
		await expect(page.getByText("Man has made his match... now it's his problem.")).toBeVisible();
		await expect(page.getByText('In the smog-choked dystopian Los Angeles')).toBeVisible();
		await expect(page.getByText('118 mins')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Trailer' })).toHaveAttribute(
			'href',
			'https://www.youtube.com/watch?v=official-trailer-key'
		);
		await expect(page.getByRole('link', { name: 'TMDB', exact: true })).toHaveAttribute(
			'href',
			'https://www.themoviedb.org/movie/78'
		);
		await expect(page.getByText('7.9')).toBeVisible();
		await expect(page.getByText('14,500 ratings on TMDB')).toBeVisible();
	});

	test('shows the cast, crew, details, genres and releases in tabs', async ({ page }) => {
		await page.goto('/film/78');
		const panel = page.getByRole('tabpanel');

		await expect(panel.getByText('Harrison Ford')).toBeVisible();

		await page.getByRole('tab', { name: 'Crew' }).click();
		await expect(panel.getByText('Screenplay')).toBeVisible();
		await expect(panel.getByText('Hampton Fancher')).toBeVisible();
		await expect(panel.getByText('Harrison Ford')).toBeHidden();

		await page.getByRole('tab', { name: 'Details' }).click();
		await expect(panel.getByText('Warner Bros. Pictures')).toBeVisible();
		await expect(panel.getByText('United States')).toBeVisible();
		await expect(panel.getByText('Japanese')).toBeVisible();

		await page.getByRole('tab', { name: 'Genres' }).click();
		await expect(panel.getByText('Science Fiction')).toBeVisible();

		await page.getByRole('tab', { name: 'Releases' }).click();
		await expect(panel.getByRole('heading', { name: 'Theatrical' })).toBeVisible();
		await expect(panel.getByText('Jun 25, 1982')).toBeVisible();
		await expect(panel.getByText('France')).toBeVisible();
	});

	test('shows where to watch and credits JustWatch', async ({ page }) => {
		await page.goto('/film/78');
		const watch = page.locator('section', { hasText: 'Where to watch' }).first();

		await expect(watch.getByText('Netflix')).toBeVisible();
		await expect(watch.getByText('Apple TV')).toBeVisible();
		await expect(watch.getByText('Stream', { exact: true })).toBeVisible();
		await expect(watch.getByText('Rent', { exact: true })).toBeVisible();
		await expect(watch.getByRole('link', { name: 'All services…' })).toHaveAttribute(
			'href',
			/^https:\/\/www\.themoviedb\.org\//
		);
		await expect(watch.getByTitle('Streaming data from JustWatch.')).toHaveText('JustWatch');
	});

	test('lists the other films of the same saga, not recommendations', async ({ page }) => {
		await page.goto('/film/78');
		const related = page.getByRole('region', { name: 'Blade Runner Collection' });

		await expect(related.getByRole('heading', { name: 'Related films' })).toBeVisible();
		await expect(related.getByRole('link')).toHaveCount(1);
		await related.getByRole('link', { name: 'Blade Runner 2049 (2017)' }).click();

		await expect(page).toHaveURL('/film/335984');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Blade Runner 2049');
	});

	test('credits TMDB in the footer', async ({ page }) => {
		await page.goto('/film/78');

		await expect(page.getByRole('contentinfo')).toContainText(
			'This product uses the TMDB API but is not endorsed or certified by TMDB.'
		);
		const logo = page.getByRole('contentinfo').getByRole('img', { name: 'TMDB' });
		expect(await logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
	});

	test('answers 404 for an unknown film and for a malformed identifier', async ({ page }) => {
		for (const path of ['/film/123456', '/film/abc', '/film/78%2F..%2F..']) {
			const response = await page.goto(path);

			expect(response?.status()).toBe(404);
		}
	});

	test('shows a message when TMDB fails', async ({ page }) => {
		await page.goto('/film/500');

		await expect(page.getByRole('alert')).toHaveText('TMDB could not be reached. Try again later.');
	});

	test('waits and retries once when TMDB limits the rate', async ({ page }) => {
		await page.goto('/film/429');

		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rate Limited Once');
	});

	test('asks TMDB once and then answers from the local cache', async ({ page, request }) => {
		await page.goto('/film/9001');
		await page.goto('/film/9001');

		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cached Film');
		expect(await tmdbRequestCount(request, '/3/movie/9001')).toBe(1);
	});

	test('renders text coming from TMDB as text, never as markup', async ({ page }) => {
		let dialogs = 0;
		page.on('dialog', () => (dialogs += 1));

		await page.goto('/film/666');

		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			'<img src=x onerror=alert(1)>'
		);
		await expect(page.getByText('<script>alert(1)</script>')).toBeVisible();
		expect(dialogs).toBe(0);
	});
});

test.describe('film page in another language', () => {
	test.use({ locale: 'fr-FR' });

	test('asks TMDB for the language of the interface', async ({ page, request }) => {
		const account = await createAccount(request);
		await page.goto('/login');
		await page.getByLabel("Nom d'utilisateur").fill(account.username);
		await page.getByLabel('Mot de passe').fill(account.password);
		await page.getByRole('button', { name: 'Se connecter' }).click();
		await expect(page).toHaveURL('/');

		await page.goto('/film/9002');

		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Language fr-FR');
		await expect(page.getByText('Réalisé par Ridley Scott')).toBeVisible();
	});
});

test.describe('TMDB key', () => {
	test('cannot be seen or changed by a regular account', async ({ page, request, baseURL }) => {
		await signIn(page, await createAccount(request));

		const response = await page.goto('/settings/instance');
		expect(response?.status()).toBe(403);

		await page.request.post('/settings/instance?/tmdb', {
			headers: { origin: baseURL ?? '' },
			form: { key: 'wrong-key' }
		});
		await page.goto('/film/78');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Blade Runner');
	});
});

test.describe('film API', () => {
	test('returns a film', async ({ request }) => {
		const token = await apiSignIn(request, admin);

		const response = await request.get('/api/v1/films/78', { headers: bearer(token) });

		expect(response.status()).toBe(200);
		expect(await response.json()).toMatchObject({
			film: { id: 78, title: 'Blade Runner', year: 1982, directors: [{ name: 'Ridley Scott' }] }
		});
	});

	test('answers 404 for an unknown film', async ({ request }) => {
		const token = await apiSignIn(request, admin);

		const response = await request.get('/api/v1/films/123456', { headers: bearer(token) });

		expect(response.status()).toBe(404);
		expect(await response.json()).toEqual({ error: 'not_found' });
	});

	test('searches films', async ({ request }) => {
		const token = await apiSignIn(request, admin);

		const response = await request.get('/api/v1/search/films?q=2049', { headers: bearer(token) });

		expect(await response.json()).toEqual({
			films: [
				{
					id: 335984,
					title: 'Blade Runner 2049',
					originalTitle: 'Blade Runner 2049',
					year: 2017,
					posterPath: '/blade-runner-poster.jpg',
					directors: [{ id: 578, name: 'Ridley Scott' }],
					alternativeTitles: ['Blade Runner', 'Der Blade Runner', 'ブレードランナー']
				}
			],
			total: 1,
			page: 1,
			totalPages: 1
		});
	});

	test('rejects a malformed page number', async ({ request }) => {
		const token = await apiSignIn(request, admin);

		for (const page of ['0', 'abc', '501', '1.5']) {
			const response = await request.get(`/api/v1/search/films?q=blade&page=${page}`, {
				headers: bearer(token)
			});

			expect(response.status()).toBe(400);
		}
	});

	test('is closed to anonymous requests', async ({ request }) => {
		for (const path of ['/api/v1/films/78', '/api/v1/search/films?q=blade']) {
			expect((await request.get(path)).status()).toBe(401);
		}
	});
});
