// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../node_modules/@types/serviceworker/index.d.ts" />

import assets from 'build:assets'
import { book, pageURL } from './api'
import { DB, DBBook } from './database'
import { Message, respond } from './message'
import { Book } from './models'

// const sw = self as unknown as ServiceWorkerGlobalScope & typeof globalThis

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
        Promise.all([
            caches.open(STATIC_CACHE_NAME).then(cache => {
                return cache.addAll(Array.from(cachedAssets))
            }),

            caches.open(STATIC_CACHE_NAME).then(async cache => {
                for (const key of await cache.keys()) {
                    const url = new URL(key.url)
                    if (!cachedAssets.has(url.pathname)) {
                        cache.delete(key)
                    }
                }
            }),
        ]),
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

async function cacheStatic(request: Request, path: string): Promise<Response> {
    const staticCache = await caches.open(STATIC_CACHE_NAME)
    const r = await staticCache.match(path)
    if (r !== undefined) {
        return r
    }

    return await fetch(request)
}

async function cacheThumbnail(
    event: FetchEvent,
    request: Request,
    path: string,
): Promise<Response> {
    const imageCache = await caches.open(IMAGE_CACHE_NAME)
    const r = await imageCache.match(path, {
        ignoreSearch: true,
    })
    if (r !== undefined) {
        return r
    }

    event.waitUntil(
        caches.open(IMAGE_CACHE_NAME).then(cache => cache.add(request)),
    )

    const pageURL = request.url.replace('/thumbnail', '')

    return await cachePage(request, pageURL)
}

async function cachePage(request: Request, path: string): Promise<Response> {
    const imageCache = await caches.open(IMAGE_CACHE_NAME)
    const r = await imageCache.match(path, {
        ignoreSearch: true,
    })
    if (r !== undefined) {
        return r
    }
    return await fetch(request)
}

addEventListener('fetch', function (event) {
    const request = event.request
    const url = new URL(request.url)

    if (cachedAssets.has(url.pathname)) {
        event.respondWith(cacheStatic(request, url.pathname))
        return
    }

    if (!url.pathname.startsWith('/api/')) {
        event.respondWith(cacheStatic(request, '/'))
        return
    }

    if (globToRegex('/api/books/*/page/*/thumbnail').test(url.pathname)) {
        event.respondWith(cacheThumbnail(event, request, url.pathname))
        return
    }

    if (globToRegex('/api/books/*/page/*').test(url.pathname)) {
        event.respondWith(cachePage(request, url.pathname))
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

addAsyncEventListener('message', async function (event) {
    const message: Message = event.data

    let books: DBBook[] | undefined
    if (message.type === 'download-book') {
        books = await book.list({ id: message.bookID })
    }
    if (message.type === 'download-series') {
        books = await book.list({ series: message.seriesName })
    }
    // console.log(books)

    if (books !== undefined) {
        for (const b of books) {
            await cacheBook(b)
            await DB.saveBook(b, {
                downloaded: true,
            })
        }
        respond(event, { type: 'book-update' })
    }
})

// eslint-disable-next-line no-console
console.log('v29')
