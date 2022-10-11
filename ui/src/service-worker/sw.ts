// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../node_modules/@types/serviceworker/index.d.ts" />
import assets from 'build:assets'
import { book } from 'src/api'
import { persist } from 'src/cache'
import { openPageCache, openStaticCache, openThumbCache } from 'src/caches'
import { Message } from 'src/message'
import { cacheBooks } from 'src/service-worker/cache'

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

    const staticCache = await openStaticCache()
    await staticCache.addAll(Array.from(newCachedAssets))
    for (const key of await staticCache.keys()) {
        const url = new URL(key.url)
        if (
            !newCachedAssets.has(url.pathname) &&
            !cachedAssets.has(url.pathname)
        ) {
            staticCache.delete(key)
        }
    }
})

async function cacheStatic(event: FetchEvent, path: string): Promise<Response> {
    const staticCache = await openStaticCache()
    const response = await staticCache.match(path)
    if (response !== undefined) {
        return response
    }
    const fallbackResponse = await staticCache.match('/')
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
