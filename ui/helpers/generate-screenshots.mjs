/* eslint-disable no-console */
// @ts-check

import { join, resolve } from 'node:path'
import { chromium, devices } from 'playwright'
import { config } from 'dotenv'
import { rm, writeFile } from 'node:fs/promises'

config({
    path: resolve(import.meta.dirname, '../../.env'),
    quiet: true
})

/** @type {['narrow'|'wide', 'light'|'dark', (typeof devices)[string]][]} */
const cases = [
    ['wide', 'light', devices['Desktop Chrome']],
    ['wide', 'light', devices['Desktop Chrome']],
    ['narrow', 'light', devices['iPhone 15 Pro']],
    ['narrow', 'light', devices['iPhone 15 Pro']],
]


const screenshotDir = resolve(import.meta.dirname, `../res/screenshots`)

async function main() {
    await rm(screenshotDir, { recursive: true }).catch(() => console.warn('failed to delete screenshot dir'))
    const browser = await chromium.launch({ headless: false })
    /** @type {import('../lib/webmanifest').Screenshot[]} */
    const screenshots = []
    for (const [formFactor, colorScheme, device] of cases) {
        const context = await browser.newContext({
            ...device,
            baseURL: 'http://localhost:12388',
            colorScheme: colorScheme,
        })
        const page = await context.newPage()

        screenshots.push(...(await generateScreenshots(formFactor, colorScheme, page)))

        await context.close()
    }

    // other actions...
    await browser.close()

    await writeFile(
        join(screenshotDir, 'index.json'),
        JSON.stringify(screenshots, undefined, '    '),
    )
}

/**
 *
 * @param {string} formFactor
 * @param {string} colorScheme
 * @param {import('playwright').Page} page
 * @returns {Promise<import('../lib/webmanifest').Screenshot[]>}
 */
async function generateScreenshots(formFactor, colorScheme, page) {
    /** @type {import('../lib/webmanifest').Screenshot[]} */
    const screenshots = []

    /**
     * @typedef {{
     *   label?: string;
     *   formFactor?: import('../lib/webmanifest').FormFactor
     *   colorScheme?: 'light'|'dark'
     * }} Options
     * 
     * @param {string} name
     * @param {Options} [options]
     * @returns
     */
    async function screenshot(name, options = {}) {
        const browser = {
            narrow: 'mobile',
            wide: 'desktop',
        }[formFactor]
        console.log(`Capturing screenshot ${browser} ${colorScheme} ${name}`)



        const relativePath = `res/screenshots/${browser}-${colorScheme}-${name}.png`
        const src = resolve(import.meta.dirname, '..', relativePath)

        if (
            (options.formFactor === undefined || options.formFactor === formFactor)
            && (options.colorScheme === undefined || options.colorScheme === colorScheme)
        ) {
            const { width, height } = page.viewportSize() ?? {}
            screenshots.push({
                src: relativePath,
                label: options.label,
                // @ts-expect-error form facotor is the correct type
                form_factor: formFactor,
                sizes: `${width}x${height}`,
            })
        }
        await page.waitForTimeout(1_000)

        const hasReload = await page.getByRole('button', { name: 'reload' }).count()
        if (hasReload > 0) {
            await page.getByRole('button', { name: 'reload' }).click()
        }

        const hasUpdate = await page.getByRole('button', { name: 'update' }).count()
        if (hasUpdate > 0) {
            await page.getByRole('button', { name: 'update' }).click()

        }

        await page.screenshot({ path: src })
    }

    // Login
    await page.goto('/login')
    await page
        .getByLabel('Username')
        .fill(process.env.SCREENSHOT_USERNAME ?? '')
    await page
        .getByLabel('Password')
        .fill(process.env.SCREENSHOT_PASSWORD ?? '')
    await page.getByRole('button', { name: 'Login' }).click()

    // Home
    await screenshot('home', { colorScheme: 'light' })

    // Book Edit
    await page.getByTestId('book-card').first().getByRole('button').click()
    await page.getByRole('button', { name: 'Edit' }).click()
    await screenshot('book-edit', { colorScheme: 'light' })

    // Book Edit
    await page.getByRole('button', { name: 'pages' }).click()
    await screenshot('book-edit-pages', { formFactor: 'wide', colorScheme: 'light' })

    // Search
    await page.getByRole('button', { name: 'close' }).click()
    await page.getByRole('link').filter({ hasText: 'Search' }).click()
    await page.getByPlaceholder('Search Series').fill('Pepper')
    await page.getByTestId('series-card').first().waitFor()
    await screenshot('search', { colorScheme: 'dark' })

    // Series View
    await page.getByTestId('series-card').first().click()
    await screenshot('series', { colorScheme: 'dark' })

    // Book View
    await page.getByTestId('book-card').first().click()
    await page.waitForTimeout(1000)
    await page.keyboard.press('Escape')
    await screenshot('reading', { colorScheme: 'dark' })

    // Profile
    await page.goto('/profile')
    await screenshot('profile', { formFactor: 'wide', colorScheme: 'dark' })

    // Settings
    await page.goto('/settings')
    await screenshot('settings', { formFactor: 'wide', colorScheme: 'dark' })

    return screenshots
}

void main()
