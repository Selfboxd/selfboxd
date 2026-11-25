import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const baseURL = `http://localhost:${String(port)}`;
const dataDir = '.e2e-data';

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
	webServer: {
		command: `rm -rf ${dataDir} && npm run build && node build`,
		port,
		reuseExistingServer: false,
		env: {
			PORT: String(port),
			ORIGIN: baseURL,
			DATA_DIR: dataDir,
			BODY_SIZE_LIMIT: '12M'
		}
	}
});
