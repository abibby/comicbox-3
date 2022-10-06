// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../node_modules/@types/serviceworker/index.d.ts" />

import assets from 'build:assets'
import { book, pageURL } from './api'
import { persist } from './cache'
import { DB } from './database'
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
const STATIC_CACHE_NAME = 'static-cache-v1'
const IMAGE_CACHE_NAME = 'image-cache-v1'

const cachedAssets = new Set(assets.map(a => `/${a.fileName}`).concat(['/']))

addEventListener('install', event => {
    // Perform install steps
    event.waitUntil(
        (async () => {
            const staticCache = await caches.open(STATIC_CACHE_NAME)
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

addEventListener('activate', event => {
    event.waitUntil(
        caches
            .keys()
            .then(keys =>
                Promise.all(
                    keys
                        .filter(key => key !== STATIC_CACHE_NAME)
                        .map(key => caches.delete(key)),
                ),
            ),
    )
})

async function cacheStatic(event: FetchEvent, path: string): Promise<void> {
    const staticCache = await caches.open(STATIC_CACHE_NAME)
    const r = await staticCache.match(path)
    if (r !== undefined) {
        event.respondWith(r)
        return
    }
}

async function cacheThumbnail(event: FetchEvent, path: string): Promise<void> {
    const imageCache = await caches.open(IMAGE_CACHE_NAME)
    const r = await imageCache.match(path, {
        ignoreSearch: true,
    })
    if (r !== undefined) {
        event.respondWith(r)
        return
    }

    event.waitUntil(
        caches.open(IMAGE_CACHE_NAME).then(cache => cache.add(event.request)),
    )

    const pageURL = path.replace('/thumbnail', '')

    await cachePage(event, pageURL)
}

async function cachePage(
    event: FetchEvent,
    path: string,
): Promise<Response | undefined> {
    const imageCache = await caches.open(IMAGE_CACHE_NAME)
    const r = await imageCache.match(path, {
        ignoreSearch: true,
    })
    if (r !== undefined) {
        event.respondWith(r)
        return
    }
}

addEventListener('fetch', function (event) {
    const request = event.request
    const url = new URL(request.url)

    if (cachedAssets.has(url.pathname)) {
        event.waitUntil(cacheStatic(event, url.pathname))
        return
    }

    if (!url.pathname.startsWith('/api/')) {
        event.waitUntil(cacheStatic(event, '/'))
        return
    }

    if (globToRegex('/api/books/*/page/*/thumbnail').test(url.pathname)) {
        event.waitUntil(cacheThumbnail(event, url.pathname))
        return
    }

    if (globToRegex('/api/books/*/page/*').test(url.pathname)) {
        event.waitUntil(cachePage(event, url.pathname))
        return
    }
})

async function cacheBook(b: Book): Promise<void> {
    const pageUrls = await Promise.all([
        pageURL(b),
        ...b.pages.map(p => pageURL(p)),
    ])

    const imageCache = await caches.open(IMAGE_CACHE_NAME)

    await imageCache.addAll(pageUrls)
}

async function cacheBooks(
    event: ExtendableMessageEvent,
    books: Book[],
): Promise<void> {
    for (const b of books) {
        await cacheBook(b)
        await DB.saveBook(b, {
            downloaded: true,
        })
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
