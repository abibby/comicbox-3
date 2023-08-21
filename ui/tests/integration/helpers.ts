import { Page, test } from '@playwright/test'
import fs from 'fs'
import { writeFile, readFile, mkdir } from 'fs/promises'
import path from 'path'

async function acquireAccount(id: number) {
    return {
        username: 'adam',
        password: 'test',
    }
}

export async function login(page: Page): Promise<void> {
    // Use parallelIndex as a unique identifier for each worker.
    const id = test.info().parallelIndex
    const dirName = path.resolve(test.info().project.outputDir, '.auth')
    const fileName = path.resolve(dirName, `${id}.json`)

    if (!fs.existsSync(fileName)) {
        // Acquire a unique account, for example create a new one.
        // Alternatively, you can have a list of precreated accounts for testing.
        // Make sure that accounts are unique, so that multiple team members
        // can run tests at the same time without interference.
        const account = await acquireAccount(id)

        // Perform authentication steps. Replace these actions with your own.
        await page.goto('/login')
        await page.getByLabel('Username').fill(account.username)
        await page.getByLabel('Password').fill(account.password)
        await page.getByRole('button', { name: 'Login' }).click()

        await page.waitForURL('/')

        // End of authentication steps.

        // Get session storage and store as env variable
        const tokens = await page.evaluate(() =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__TEST_UTILS__.getTokens().then(JSON.stringify),
        )

        await mkdir(dirName, { recursive: true })
        await writeFile(fileName, tokens, 'utf-8')
    } else {
        const f = await readFile(fileName)
        const tokensStr = f.toString()
        await page.evaluate(
            tokens =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window as any).__TEST_UTILS__.setTokens(JSON.parse(tokens)),
            tokensStr,
        )
    }
}
