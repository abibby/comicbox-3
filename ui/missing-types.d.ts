declare module '*.svg' {
    const fileName: string
    export default fileName
}

declare module 'build:assets' {
    const assets: Array<import('workbox-precaching').PrecacheEntry | string>
    export default assets
}

declare module 'rollup-plugin-cleaner' {
    const assets: () => import('rollup').Plugin
    export default assets
}
