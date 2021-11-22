import assets from 'build:assets'
import { book } from './api'
import { Message } from './message'

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
const CACHE_NAME = 'image-cache-v1'

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
    const r = await caches.match(path)
    if (r !== undefined) {
        return r
    }
    return await fetch(request)
}

async function staleWhileRevalidate(
    request: Request,
    path: string,
): Promise<Response> {
    const cacheP = caches.match(path)
    const netP = fetch(request)

    let r = await cacheP

    if (r === undefined) {
        r = await netP
    }
    caches.open(CACHE_NAME).then(cache => cache.add(request))
    return r
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
        event.respondWith(staleWhileRevalidate(request, url.pathname))
        return
    }
})

sw.addEventListener('message', function (event) {
    console.log('WORKER: message', event.data)
    const message: Message = event.data

    if (message.type === 'download') {
        book.list({ id: message.bookID })
    }
})
