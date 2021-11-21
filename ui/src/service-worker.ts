import assets from 'build:assets'
// import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
// import { registerRoute } from 'workbox-routing'
// import { CacheFirst } from 'workbox-strategies'

// precacheAndRoute(assets)
// cleanupOutdatedCaches()

self.addEventListener('install', () => {
    console.log('install', assets)
})

// const staticMatcher = new RegExp('.*.(css|js|svg)$')
// // registerRoute(
// //     staticMatcher,
// //     new StaleWhileRevalidate({
// //         cacheName: 'static',
// //         plugins: [
// //             // Ensure that only requests that result in a 200 status are cached
// //             new CacheableResponsePlugin({
// //                 statuses: [200],
// //             }),
// //         ],
// //     }),
// // )

// registerRoute(
//     new RegExp('/api/books/([^/]+)/page/([^/]+)/thumbnail'),
//     new CacheFirst({ cacheName: 'thumbnails' }),
// )

// registerRoute(
//     ({ url }) =>
//         !url.pathname.startsWith('/api/') && !url.pathname.match(staticMatcher),
//     async () => {
//         return new Response('test')
//     },
// )
