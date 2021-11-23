import assets from 'build:assets'
import { book, pageURL } from './api'
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
console.log(cachedAssets)

sw.addEventListener('install', event => {
    if (__ENV !== 'production') {
        console.log('WORKER: installing')
    }
    // Perform install steps
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(cache => {
            return cache.addAll(Array.from(cachedAssets))
        }),
    )
})
sw.addEventListener('activate', event => {
    console.log('WORKER: activate')

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
        cacheName: IMAGE_CACHE_NAME,
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
    const responsePromise = fetch(request)

    caches.open(IMAGE_CACHE_NAME).then(cache => cache.add(request))

    return await responsePromise
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
    console.log(pageUrls)

    const cache = await caches.open(IMAGE_CACHE_NAME)
    console.log(cache)

    await cache.addAll(pageUrls)
}

sw.addEventListener('message', async function (event) {
    const message: Message = event.data

    if (message.type === 'download-book') {
        book.list({ id: message.bookID })
    }
    if (message.type === 'download-series') {
        const books = await book.list({ series: message.seriesName })
        console.log(books)

        for (const b of books) {
            await cacheBook(b)
        }
    }
})
