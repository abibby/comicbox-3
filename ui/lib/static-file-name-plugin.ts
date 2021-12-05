import { extname } from 'path'
import { Plugin } from 'rollup'

interface ResolveFilePluginOptions {
    files: string[]
}

export default function staticFileNamePlugin(
    options: ResolveFilePluginOptions,
): Plugin {
    return {
        name: 'resolve-file',
        resolveFileUrl({ fileName }) {
            for (const file of options.files) {
                if (fileName.startsWith(file)) {
                    return JSON.stringify('/' + file + extname(fileName))
                }
            }
            return null
        },
        async generateBundle(_, bundle) {
            const entries = Object.values(bundle)

            for (const file of options.files) {
                const entry = entries.find(e => e.name === file)
                if (entry === undefined) {
                    continue
                }
                delete bundle[entry.fileName]

                entry.fileName = entry.name + '.js'

                bundle[entry.fileName] = entry
            }
        },
    }
}
