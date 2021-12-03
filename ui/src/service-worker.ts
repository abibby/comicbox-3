import assets from 'build:assets'
import { book, pageURL } from './api'
import { DB, DBBook } from './database'
import { Message } from './message'
import { Book } from './models'

const sw = self as unknown as ServiceWorkerGlobalScope & typeof globalThis

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

const cachedAssets = new Set(assets.map(a => `/${a.fileName}`))

sw.addEventListener('install', event => {
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
sw.addEventListener('activate', event => {
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

async function cacheFirst(request: Request, path: string): Promise<Response> {
    const r = await caches.match(path, {
        cacheName: STATIC_CACHE_NAME,
    })
    if (r !== undefined) {
        return r
    }
    return await fetch(request)
}

async function cacheThumbnail(
    request: Request,
    path: string,
): Promise<Response> {
    const r = await caches.match(path, {
        cacheName: IMAGE_CACHE_NAME,
        ignoreSearch: true,
    })
    if (r !== undefined) {
        return r
    }
    caches.open(IMAGE_CACHE_NAME).then(cache => cache.add(request))

    const pageURL = request.url.replace('/thumbnail', '')

    return await cachePage(request, pageURL)
}

async function cachePage(request: Request, path: string): Promise<Response> {
    const r = await caches.match(path, {
        cacheName: IMAGE_CACHE_NAME,
        ignoreSearch: true,
    })
    if (r !== undefined) {
        return r
    }
    return await fetch(request)
}

sw.addEventListener('fetch', function (event) {
    const request = event.request
    const url = new URL(request.url)

    if (cachedAssets.has(url.pathname)) {
        event.respondWith(cacheFirst(request, url.pathname))
        return
    }

    if (!url.pathname.startsWith('/api/')) {
        event.respondWith(cacheFirst(request, '/index.html'))
        return
    }

    if (globToRegex('/api/books/*/page/*/thumbnail').test(url.pathname)) {
        event.respondWith(cacheThumbnail(request, url.pathname))
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

    const cache = await caches.open(IMAGE_CACHE_NAME)

    await cache.addAll(pageUrls)
}

sw.addEventListener('message', function (event) {
    event.waitUntil(
        (async () => {
            const message: Message = event.data
            console.log(message)

            let books: DBBook[] | undefined
            if (message.type === 'download-book') {
                books = await book.list({ id: message.bookID })
            }
            if (message.type === 'download-series') {
                books = await book.list({ series: message.seriesName })
            }
            console.log(books)

            if (books !== undefined) {
                for (const b of books) {
                    await cacheBook(b)
                    b.downloaded = true
                    b.dirty = 1
                }
                await DB.books.bulkPut(books)
                event.source?.postMessage('book updated')
            }
        })(),
    )
})

// eslint-disable-next-line no-console
console.log('v13')
