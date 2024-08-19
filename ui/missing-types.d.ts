declare module 'asset-url:*' {
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

declare module 'rollup-plugin-includepaths' {
    // https://github.com/dot-build/rollup-plugin-includepaths

    export interface Options {
        // An array of source paths in your project where the plugin should look
        // for files
        paths: string[]
        // A map of module=>path/to/file.js with custom module paths. Used to
        // override the search with a static path (like Browserify does with the
        // "browser" config).
        include: Record<string, string>
        // An array of module names that should be excluded from the bundle
        // (external modules).
        external: string[]
        // An array of file extensions to look for in the project.
        extensions: string[]
    }
    const assets: (opt?: Partial<Options>) => import('rollup').Plugin
    export default assets
}

declare const __ENV: 'production' | 'development'
