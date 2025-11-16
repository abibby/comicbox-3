/* eslint-disable no-console */
// @ts-check

import fetch from 'node-fetch'
import { exec } from 'node:child_process'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'


const bookDir = resolve(import.meta.dirname, '../../test-books')

const hrefRegex = /href="([^"]*)"/g

async function downloadPepperCarrot() {
    const base = 'https://www.peppercarrot.com/0_sources/'
    const links = await fetchLinks(base)
    const chapterLinks = links.filter(l => l.startsWith(base + "ep") && l.endsWith('/'))

    for (const chapterLink of chapterLinks) {
        await downloadPepperCarrotChapter(chapterLink)
    }
}

/**
 * @param {string} url
 */
async function downloadPepperCarrotChapter(url) {
    const imageBase = new URL('hi-res/', url).toString()

    const matches = basename(url).match(/^ep(\d+)_(.*)$/) ?? []
    const chapter = Number(matches[1])
    const title = matches[2].replaceAll('-', ' ')
    const chapterDir = join(bookDir, `Pepper and Carrot/Pepper and Carrot #${chapter} ${title}/`)
    const chapterCbz = chapterDir.slice(0, -1) + '.cbz'

    if (await fileExists(chapterCbz)) {
        return
    }

    console.log(`Downloading chapter ${chapter} - ${title}`);

    const links = await fetchLinks(imageBase)


    const pageLinks = links.filter(l => {
        const [, page] = l.match(/en_Pepper-and-Carrot.*_E\d+P(\d+)/) ?? ['', '0']
        return Number(page) > 0
    })


    await mkdir(chapterDir, { recursive: true })

    for (const page of pageLinks) {
        const imageFile = join(chapterDir, basename(page))
        if (await fileExists(imageFile)) {
            continue
        }

        const data = await fetch(page).then(r => r.blob())
        await writeFile(imageFile, data.stream())
    }

    await zipDir(chapterDir, chapterCbz)
    await rm(chapterDir, { recursive: true })
}

/**
 * @param {string|URL} url 
 * @returns {Promise<string[]>}
 */
async function fetchLinks(url) {
    const html = await fetch(url).then(r => r.text())
    return html.match(hrefRegex)?.map(link => new URL(link.slice(6, -1), url).toString()) ?? []
}

/**
 * @param {string} file
 * @returns {Promise<boolean>}
 */
async function fileExists(file) {
    try {
        await stat(file)
        return true
    } catch (_e) {
        return false
    }
}

/**
 * 
 * @param {string} dir 
 * @param {string} zipFile
 * @returns {Promise<void>}
 */
async function zipDir(dir, zipFile) {
    return new Promise((resolve, reject) => {
        exec(`zip -r '${zipFile}' '${dir}'`, (error, _stdout, stderr) => {
            if (error) {
                console.error(stderr)
                reject(error)
            } else {
                resolve()
            }
        })
    })
}

void downloadPepperCarrot()