// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../node_modules/@types/serviceworker/index.d.ts" />

import { pageURL } from 'src/api'
import {
    backgroundFetch,
    BackgroundFetchRegistration,
} from 'src/background-fetch'
import { openPageCache, openThumbCache } from 'src/caches'
import { Book } from 'src/models'
import { Progressor } from 'src/service-worker/progressor'
import { bookFullName } from 'src/services/book-service'
import { sendMessage } from './send-message'

async function cacheBook(b: Book): Promise<void> {
    const progressor = new Progressor(b.pages.length + 1, 'book', b.id)
    await progressor.start()

    // const thumbCache = await openThumbCache()
    // await thumbCache.add(await pageURL(b))
    await progressor.next()
    const bgFetch = await backgroundFetch(
        b.id,
        await Promise.all([pageURL(b), ...b.pages.map(p => pageURL(p))]),
        {
            title: b.series?.name + ' ' + bookFullName(b),
            // downloadTotal: 10000000,
        },
    )
    // reg.onprogress = e => {
    //     console.log(e)
    // }
    bgFetch.addEventListener('progress', e => {
        // eslint-disable-next-line no-console
        console.log(e)
    })

    // const id = setInterval(() => {
    //     // eslint-disable-next-line no-console
    //     console.log(bgFetch)
    // }, 1000)

    // setTimeout(() => {
    //     // eslint-disable-next-line no-console
    //     console.log(bgFetch)
    //     void bgFetch.abort()
    //     clearInterval(id)
    // }, 30_000)

    // const pageCache = await openPageCache(b.id)
    // await Promise.all(
    //     b.pages.map(async p => {
    //         await pageCache.add(await pageURL(p))
    //         await progressor.next()
    //     }),
    // )
    // await progressor.finish()
}

export async function cacheBooks(books: Book[]): Promise<void> {
    for (const b of books) {
        await cacheBook(b)
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
addEventListener('backgroundfetchsuccess', (event: any) => {
    const bgFetch: BackgroundFetchRegistration = event.registration

    event.waitUntil(
        (async function () {
            const caches = new Map<string, Cache>()
            // Create/open a cache.
            const thumbCache = await openThumbCache()

            // Get all the records.
            const records = await bgFetch.matchAll()

            // Copy each request/response across.
            const promises = records.map(async record => {
                const response = await record.responseReady
                const url = new URL(record.request.url)
                if (url.pathname.endsWith('/thumbnail')) {
                    await thumbCache.put(record.request, response)
                } else {
                    // /api/books/0437f6b3-57df-443a-a72f-5c8ce98dffcb/page/1
                    const id = url.pathname.split('/')[3]
                    if (!id) {
                        throw new Error('invalid download url: ' + url)
                    }

                    let cache = caches.get(id)
                    if (!cache) {
                        cache = await openPageCache(id)
                        caches.set(id, cache)
                    }
                    await cache.put(record.request, response)
                }
            })

            // Wait for the copying to complete.
            await Promise.all(promises)

            for (const id of caches.keys()) {
                await sendMessage({
                    type: 'download',
                    downloadType: 'progress',
                    model: 'book',
                    id: id,
                    progress: 100,
                })
            }

            // Update the progress notification.
            // event.updateUI({ title: 'Download Complete!' })
        })(),
    )
})
