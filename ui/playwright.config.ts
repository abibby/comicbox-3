import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: 'tests/integration',
    // projects: [
    //     { name: 'setup', testMatch: /.*\.setup\.ts/ },
    //     {
    //         name: 'chrome',
    //         use: {
    //             ...devices['Desktop Chrome'],
    //         },
    //     },
    // ],
    use: {
        baseURL: 'http://127.0.0.1:8080',
    },
    webServer: {
        command: 'make test',
        cwd: '..',
        url: 'http://127.0.0.1:8080',
        reuseExistingServer: !process.env.CI,
        // timeout: 5 * 1000,
        env: {
            // APP_KEY: 'secret',
            // DB_PATH: ':memory:',
            // LIBRARY_PATH: './test',
            // PUBLIC_USER_CREATE: 'true',
            // SCAN_ON_STARTUP: 'false',
            // SCAN_INTERVAL: '',
        },
    },
})
