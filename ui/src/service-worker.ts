// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../node_modules/@types/serviceworker/index.d.ts" />

import assets from 'build:assets'
import { book, pageURL } from './api'
import { persist } from './cache'
import { openPageCache, openStaticCache, openThumbCache } from './caches'
import { Message, respond } from './message'
import { Book } from './models'

interface SyncEvent extends ExtendableEvent {
    readonly lastChance: boolean
    readonly tag: string
}
declare global {
    interface ServiceWorkerGlobalScopeEventMap {
        sync: SyncEvent
    }
}

type AsyncEvents =
    | 'activate'
    | 'fetch'
    | 'install'
    | 'message'
    // | 'messageerror'
    | 'notificationclick'
    | 'notificationclose'
    | 'push'

function addAsyncEventListener<K extends AsyncEvents>(
    type: K,
    listener: (
        this: ServiceWorkerGlobalScope,
        ev: ServiceWorkerGlobalScopeEventMap[K],
    ) => Promise<void>,
    options?: boolean | AddEventListenerOptions,
): void {
    addEventListener(
        type,
        function (event) {
            event.waitUntil(listener.call(this, event))
        },
        options,
    )
}

function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
function globToRegex(glob: string): RegExp {
    const re = escapeRegExp(glob)
        .replace(/\\\*\\\*/g, '😎')
        .replace(/\\\*/g, '[^/]*')
        .replace(/😎/g, '.*')

    return new RegExp(`^${re}$`)
}

const cachedAssets = new Set(assets.map(a => `/${a.fileName}`).concat(['/']))

addEventListener('install', event => {
    // Perform install steps
    event.waitUntil(
        (async () => {
            const staticCache = await openStaticCache()
            await staticCache.addAll(Array.from(cachedAssets))
            for (const key of await staticCache.keys()) {
                const url = new URL(key.url)
                if (!cachedAssets.has(url.pathname)) {
                    staticCache.delete(key)
                }
            }
        })(),
    )
})

async function cacheStatic(event: FetchEvent, path: string): Promise<Response> {
    const staticCache = await openStaticCache()
    const r = await staticCache.match(path)
    if (r !== undefined) {
        return r
    }

    return fetch(event.request)
}

async function cacheThumbnail(
    event: FetchEvent,
    path: string,
): Promise<Response> {
    const imageCache = await openThumbCache()

    const r = await imageCache.match(path, {
        ignoreSearch: true,
    })
    if (r !== undefined) {
        return r
    }

    event.waitUntil(imageCache.add(event.request))

    const pageURL = path.replace('/thumbnail', '')

    return cachePage(event, pageURL)
}

async function cachePage(event: FetchEvent, path: string): Promise<Response> {
    // /api/books/1ae1a596-e781-4793-9d68-8e1857a8142b/page/0/thumbnail
    const bookID = path.split('/')[3]
    if (bookID === undefined) {
        return fetch(event.request)
    }

    const imageCache = await openPageCache(bookID)
    const r = await imageCache.match(path, {
        ignoreSearch: true,
    })
    if (r !== undefined) {
        return r
    }
    return fetch(event.request)
}

addEventListener('fetch', event => {
    const request = event.request
    const url = new URL(request.url)

    if (cachedAssets.has(url.pathname)) {
        event.respondWith(cacheStatic(event, url.pathname))
        return
    }

    if (!url.pathname.startsWith('/api/')) {
        event.respondWith(cacheStatic(event, '/'))
        return
    }

    if (globToRegex('/api/books/*/page/*/thumbnail').test(url.pathname)) {
        event.respondWith(cacheThumbnail(event, url.pathname))
        return
    }

    if (globToRegex('/api/books/*/page/*').test(url.pathname)) {
        event.respondWith(cachePage(event, url.pathname))
        return
    }
})

async function sendMessage(message: Message): Promise<void> {
    const windows = await clients.matchAll({
        includeUncontrolled: true,
        type: 'window',
    })
    for (const w of windows) {
        w.postMessage(message)
    }
}

function progresser(
    total: number,
    model: 'book' | 'series',
    id: string,
): (finished?: boolean) => Promise<void> {
    let current = 0
    return async (finished = false) => {
        if (finished) {
            await sendMessage({
                type: 'download-complete',
                model: model,
                id: id,
            })
            return
        }

        current++
        await sendMessage({
            type: 'download-progress',
            model: model,
            id: id,
            progress: current / total,
        })
    }
}

async function cacheBook(b: Book): Promise<void> {
    const pageDownloaded = progresser(b.pages.length + 1, 'book', b.id)

    const thumbCache = await openThumbCache()
    thumbCache.add(await pageURL(b))
    pageDownloaded()
    const pageCache = await openPageCache(b.id)
    await Promise.all(
        b.pages.map(async p => {
            await pageCache.add(await pageURL(p))
            pageDownloaded()
        }),
    ),
        pageDownloaded(true)
}

async function cacheBooks(
    event: ExtendableMessageEvent,
    books: Book[],
): Promise<void> {
    for (const b of books) {
        await cacheBook(b)
    }
    respond(event, { type: 'book-update' })
}

addAsyncEventListener('message', async function (event) {
    const message: Message = event.data

    switch (message.type) {
        case 'download-book':
            await cacheBooks(event, await book.list({ id: message.bookID }))
            break
        case 'download-series':
            await cacheBooks(
                event,
                await book.list({ series: message.seriesName }),
            )
            break
    }
})

addEventListener('sync', event => {
    if (event.tag === 'persist') {
        persist(false, true)
    }
})
