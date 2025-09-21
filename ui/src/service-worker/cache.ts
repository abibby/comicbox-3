// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../node_modules/@types/serviceworker/index.d.ts" />

import { pageURL } from 'src/api'
import { BackgroundFetchRegistration } from 'src/background-fetch'
import { openPageCache, openThumbCache } from 'src/caches'
import { Book } from 'src/models'
import { Progressor } from 'src/service-worker/progressor'
import { sendMessage } from 'src/service-worker/send-message'

async function cacheBook(b: Book): Promise<void> {
    const progressor = new Progressor(b.pages.length + 1, 'book', b.id)
    await progressor.start()

    const thumbCache = await openThumbCache()
    await thumbCache.add(await pageURL(b))
    await progressor.next()

    const pageCache = await openPageCache(b.id)
    await Promise.all(
        b.pages.map(async p => {
            await pageCache.add(await pageURL(p))
            await progressor.next()
        }),
    )
    await progressor.finish()
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
        })(),
    )
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
addEventListener('backgroundfetchclick', (event: any) => {
    const bgFetch: BackgroundFetchRegistration = event.registration

    const [prefix, id] = bgFetch.id.split(':')
    switch (prefix) {
        case 'book':
            void navigate(`/book/${id}`)
            return
        case 'series':
            void navigate(`/series/${id}`)
            return
    }
})

async function navigate(path: string) {
    const windows = await clients.matchAll({
        includeUncontrolled: true,
        type: 'window',
    })

    for (const w of windows) {
        if (w.visibilityState === 'visible') {
            void w.navigate(path)
            return
        }
    }

    const w = windows[0]
    if (w) {
        await w.focus()
        await w.navigate(path)
        return
    }
    await clients.openWindow(path)
}
