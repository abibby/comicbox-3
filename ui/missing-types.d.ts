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

declare module '@surma/rollup-plugin-off-main-thread' {
    export interface Options {
        // A string containing the EJS template for the amd loader. If
        // undefined, OMT will use loader.ejs.
        loader?: string
        // Use fetch() + eval() to load dependencies instead of <script> tags
        // and importScripts(). This is not CSP compliant, but is required if
        // you want to use dynamic imports in ServiceWorker.
        useEval?: boolean
        // A RegExp to find new Workers() calls. The second capture group must
        // capture the provided file name without the quotes.
        workerRegexp?: RegExp
        // Function name to use instead of AMD’s define.
        amdFunctionName?: string
        // A function that determines whether the loader code should be
        // prepended to a certain chunk. Should return true if the load is
        // suppsoed to be prepended.
        prependLoader?: () => boolean
        // Scheme to use when importing workers as URLs. If undefined, OMT will
        // use "omt".
        urlLoaderScheme?: string
    }
    const assets: (opt?: Options) => import('rollup').Plugin
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

declare module 'omt:*' {
    const url: string
    export default url
}

declare const __ENV: 'production' | 'development'
