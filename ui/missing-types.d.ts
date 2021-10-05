declare module "*.svg" {
    const fileName: string
    export default fileName
}

declare module "rollup-plugin-rebase" {
    export interface RebaseOptions {
        include?: Array<string | RegExp> | string | RegExp | null
        exclude?: Array<string | RegExp> | string | RegExp | null
        verbose?: boolean
        keepName?: boolean
        assetFolder?: string
    }
    export default function(options?: RebaseOptions): import('rollup').Plugin
}
