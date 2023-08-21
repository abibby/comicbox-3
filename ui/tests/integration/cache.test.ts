/* eslint-disable jest/no-test-callback */
// import { expect, test } from './playwright.fixtures'
import { expect, test } from '@playwright/test'
import { login } from './helpers'

test('Login', async ({ page }) => {
    await login(page)
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Reading' })).toBeVisible()

    await page.screenshot({ path: './test.png' })
})

test('check cache', async ({ page }) => {
    await login(page)
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Reading' })).toBeVisible()

    await page.waitForTimeout(2000)
    await page.screenshot({ path: './test.png' })
})
