import { Plugin } from 'vite'
import type { OutputOptions, PreRenderedAsset, PreRenderedChunk } from 'rollup'

export default function staticOutputPlugin(staticAssets: string[]): Plugin {
    function outputOptions(
        o?: OutputOptions | OutputOptions[],
    ): OutputOptions | OutputOptions[] {
        if (o instanceof Array) {
            return o.map(outputOptions) as OutputOptions[]
        }
        return {
            ...o,
            entryFileNames: (f: PreRenderedChunk): string => {
                if (staticAssets.includes(f.name)) {
                    return '[name].js'
                }
                if (o?.entryFileNames instanceof Function) {
                    return o.entryFileNames(f)
                }
                return o?.entryFileNames ?? '[name]-[hash].js'
            },
            chunkFileNames: (f: PreRenderedChunk): string => {
                if (staticAssets.includes(f.name)) {
                    return '[name].js'
                }
                if (o?.chunkFileNames instanceof Function) {
                    return o.chunkFileNames(f)
                }
                return o?.chunkFileNames ?? '[name]-[hash].js'
            },
            assetFileNames: (f: PreRenderedAsset): string => {
                if (f.name && staticAssets.includes(f.name)) {
                    return '[name].js'
                }
                if (o?.assetFileNames instanceof Function) {
                    return o.assetFileNames(f)
                }
                return o?.assetFileNames ?? '[name]-[hash].[ext]'
            },
        }
    }

    return {
        name: 'static-output-plugin',
        config(o) {
            o.build = {
                ...o.build,
                rollupOptions: {
                    ...o.build?.rollupOptions,
                    output: outputOptions(o.build?.rollupOptions?.output),
                },
            }
        },
    }
}
