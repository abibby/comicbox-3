import { basename } from 'path'
import { Plugin, rollup, RollupOptions } from 'rollup'
import buildAssetPlugin from './build-assets-plugin'

export default function serviceWorkerPlugin(): Plugin {
    const prefix = 'service-worker:'
    const suffix = '.service-worker'

    let rollupOptions: RollupOptions | null = null
    const pluginName = 'service-worker-plugin'

    return {
        name: pluginName,
        options(options) {
            rollupOptions = {
                ...options,
                output: undefined,
                cache: false,
                plugins: options.plugins
                    ?.filter(p => !p || p.name !== pluginName)
                    .map(p => {
                        if (p && p.name === 'build-assets-plugin') {
                            return buildAssetPlugin(false)
                        }
                        return p
                    }),
            }
            return undefined
        },
        async resolveId(id, importer) {
            if (!id.startsWith(prefix)) {
                return
            }
            const asset = await this.resolve(id.slice(prefix.length), importer)

            return prefix + (asset?.id ?? '') + suffix
        },
        async load(id) {
            if (!id.startsWith(prefix)) {
                return
            }

            console.log(`load ${id}`)

            if (rollupOptions === null) {
                throw new Error('options not set')
            }

            const path = id.slice(prefix.length, -suffix.length)

            this.addWatchFile(path)

            const fileName = basename(path).replace(/.ts$/, '.js')

            const bundle = await rollup({ ...rollupOptions, input: path })
            const result = await bundle.generate({
                format: 'iife',
                name: 'worker_code',
                sourcemap: true,
                inlineDynamicImports: true,
            })
            await bundle.close()
            this.emitFile({
                type: 'asset',
                fileName: fileName,
                name: fileName,
                source: result.output[0].code,
            })
            // console.log(result.output[0].code)

            return `${serviceWorker.toString()}
            export default function() {
                return serviceWorker(${JSON.stringify('/' + fileName)})
            }`
        },
    }
}
async function serviceWorker(swPath: string) {
    if ('serviceWorker' in navigator) {
        return navigator.serviceWorker.register(swPath, { scope: '/' })
    }
    throw new Error('this browser does not support service workers')
}
