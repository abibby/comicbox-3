import { Plugin } from 'vite'

export default function assetPlugin(): Plugin {
    const prefix = 'asset-url:'
    return {
        name: 'asset-plugin',
        async resolveId(id, importer) {
            if (!id.startsWith(prefix)) {
                return
            }
            const asset = await this.resolve(id.slice(prefix.length), importer)

            return asset?.id ?? ''
        },
    }
}
