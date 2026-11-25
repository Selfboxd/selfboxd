import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const baseURL = `http://localhost:${String(port)}`;
const dataDir = '.e2e-data';
const tmdbPort = 4174;

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: { baseURL, ...devices['Desktop Chrome'] },
	projects: [
		{ name: 'first-launch', testDir: 'e2e/first-launch', fullyParallel: false, workers: 1 },
		{ name: 'instance', testIgnore: '**/first-launch/**', dependencies: ['first-launch'] }
	],
	webServer: [
		{
			command: 'node e2e/support/tmdb/server.ts',
			port: tmdbPort,
			reuseExistingServer: false,
			env: { PORT: String(tmdbPort) }
		},
		{
			command: `rm -rf ${dataDir} && npm run build && node build`,
			port,
			reuseExistingServer: false,
			env: {
				PORT: String(port),
				ORIGIN: baseURL,
				DATA_DIR: dataDir,
				BODY_SIZE_LIMIT: '12M',
				TMDB_API_URL: `http://localhost:${String(tmdbPort)}/3`,
				MDBLIST_API_URL: `http://localhost:${String(tmdbPort)}/mdblist`,
				JOURNAL_FEED_URL: `http://localhost:${String(tmdbPort)}/journal/rss/`,
				TMDB_IMAGE_URL: `${baseURL}/tmdb-images`
			}
		}
	]
});
