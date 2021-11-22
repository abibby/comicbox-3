import { readFile } from 'fs/promises'
import { basename } from 'path'
import { Plugin } from 'rollup'

export default function assetPlugin(): Plugin {
    const prefix = 'asset-url:'
    return {
        name: 'asset-plugin',
        async resolveId(id, importer) {
            if (!id.startsWith(prefix)) {
                return
            }
            const asset = await this.resolve(id.slice(prefix.length), importer)
            return prefix + (asset?.id ?? '')
        },
        async load(id) {
            if (!id.startsWith(prefix)) {
                return
            }
            const fileName = basename(id)
            this.emitFile({
                type: 'asset',
                fileName: fileName,
                name: fileName,
                source: await readFile(id.slice(prefix.length)),
            })

            return `export default ${JSON.stringify('/' + fileName)}`
        },
    }
}
