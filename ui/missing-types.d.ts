declare module '*.svg' {
    const fileName: string
    export default fileName
}

declare module 'build:assets' {
    export interface BuildAsset {
        fileName: string
        name?: string
    }
    const assets: BuildAsset[]
    export default assets
}

declare module 'rollup-plugin-cleaner' {
    export interface Options {
        targets?: string[]
        silent?: boolean
    }
    const assets: (opt: Options) => import('rollup').Plugin
    export default assets
}

declare const __ENV: 'production' | 'development'
