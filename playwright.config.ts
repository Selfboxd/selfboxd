import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const baseURL = `http://localhost:${String(port)}`;

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: { baseURL },
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'npm run build && node build',
		port,
		reuseExistingServer: !process.env.CI,
		env: {
			PORT: String(port),
			ORIGIN: baseURL,
			DATA_DIR: 'test-results/data'
		}
	}
});
