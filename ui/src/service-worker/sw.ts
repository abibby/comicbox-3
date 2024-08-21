// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../node_modules/@types/serviceworker/index.d.ts" />
import assets from 'build:assets'
import { book } from 'src/api'
import { persist } from 'src/cache'
import {
    openStaticCache,
    openThumbCache,
    pageCacheID,
    STATIC_CACHE_NAME,
    THUMB_CACHE_NAME,
} from 'src/caches'
import { type Message } from 'src/message'
import { cacheBooks } from 'src/service-worker/cache'
import { sendMessage } from 'src/service-worker/send-message'

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

addAsyncEventListener('install', async () => {
    const cachedAssets = new Set(assets.map(a => `/${a.fileName}`))
    const newCachedAssets = new Set<string>(
        await fetch('/static-files').then(r => r.json()),
    )
    newCachedAssets.add('/')
    newCachedAssets.delete('/sw.js')

    const staticCache = await openStaticCache()
    await staticCache.addAll(Array.from(newCachedAssets))
    for (const key of await staticCache.keys()) {
        const url = new URL(key.url)
        if (
            !newCachedAssets.has(url.pathname) &&
            !cachedAssets.has(url.pathname)
        ) {
            await staticCache.delete(key)
        }
    }
})

async function cacheStatic(event: FetchEvent, path: string): Promise<Response> {
    const response = await caches.match(path, {
        cacheName: STATIC_CACHE_NAME,
    })
    if (response !== undefined) {
        return response
    }
    const fallbackResponse = await caches.match('/', {
        cacheName: STATIC_CACHE_NAME,
    })
    if (fallbackResponse !== undefined) {
        return fallbackResponse
    }

    return fetch(event.request)
    // return new Response(undefined, {
    //     status: 469,
    // })
}

async function cacheThumbnail(
    event: FetchEvent,
    path: string,
): Promise<Response> {
    const r = await caches.match(path, {
        ignoreSearch: true,
        cacheName: THUMB_CACHE_NAME,
    })

    if (r !== undefined) {
        return r
    }
    const fetchPromise = fetch(event.request)
    event.waitUntil(
        (async () => {
            const [thumbCache, response] = await Promise.all([
                openThumbCache(),
                fetchPromise,
            ])
            await thumbCache.put(event.request, response.clone())
        })(),
    )
    // /api/books/1ae1a596-e781-4793-9d68-8e1857a8142b/page/0/thumbnail
    const bookID = path.split('/')[3]

    if (bookID !== undefined) {
        const r = await caches.match(path.replace('/thumbnail', ''), {
            ignoreSearch: true,
            cacheName: pageCacheID(bookID),
        })

        if (r !== undefined) {
            return r
        }
    }

    return (await fetchPromise).clone()
}

async function cachePage(event: FetchEvent, path: string): Promise<Response> {
    // /api/books/1ae1a596-e781-4793-9d68-8e1857a8142b/page/0
    const bookID = path.split('/')[3]
    if (bookID === undefined) {
        return fetch(event.request)
    }

    const r = await caches.match(path, {
        ignoreSearch: true,
        cacheName: pageCacheID(bookID),
    })
    if (r !== undefined) {
        return r
    }
    return fetch(event.request)
}

addEventListener('fetch', event => {
    const request = event.request
    const url = new URL(request.url)

    if (url.origin !== location.origin) {
        return
    }

    if (url.searchParams.has('ignore-sw')) {
        return
    }

    if (!url.pathname.startsWith('/api/')) {
        event.respondWith(cacheStatic(event, url.pathname))
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

addAsyncEventListener('message', async function (event) {
    const message: Message = event.data

    switch (message.type) {
        case 'download-book':
            await cacheBooks(await book.list({ id: message.bookID }))
            break
        case 'download-series':
            await cacheBooks(await book.list({ series: message.seriesName }))
            break
        case 'check-update':
            await this.registration.update()
            break
        case 'skip-waiting':
            await globalThis.skipWaiting()
            await sendMessage({ type: 'reload' })
            break
    }
})

if ('onsync' in globalThis) {
    addEventListener('sync', async event => {
        if (event.tag === 'persist') {
            await persist(false, true)
        }
    })
} else {
    setInterval(async () => {
        await persist(false, true)
    }, 60 * 1000)
}
