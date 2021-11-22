import assets from 'build:assets'

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
const CACHE_NAME = 'my-site-cache-v1'

const cachedAssets = new Set(
    assets.filter(a => a.name !== 'service-worker').map(a => `/${a.fileName}`),
)
console.log(cachedAssets)

sw.addEventListener('install', event => {
    if (__ENV !== 'production') {
        console.log('WORKER: installing')
    }
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
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
                        .filter(key => key !== CACHE_NAME)
                        .map(key => caches.delete(key)),
                ),
            ),
    )
})

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
})

async function cacheFirst(request: Request, path: string): Promise<Response> {
    const r = await caches.match(path)
    if (r !== undefined) {
        return r
    }
    return await fetch(request)
}
