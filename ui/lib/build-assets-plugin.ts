import { BuildAsset } from 'build:assets'
import { Plugin } from 'rollup'
const random = JSON.stringify(
    `4A4rwiR8VuNWLmjcaFQgP5ZqsP6nswBjUcs5fKtySldpYcfkoNOpafMSJ7p5VDp09iRcU2cRZ`,
)

export default function buildAssetPlugin(replace = true): Plugin {
    const path = 'build:assets'
    return {
        name: 'build-assets-plugin',
        async resolveId(id) {
            if (id !== path) {
                return null
            }
            return id
        },
        async load(id) {
            if (id !== path) {
                return
            }

            return `export default ${random}`
        },

        async generateBundle(options, bundle) {
            if (!replace) {
                return
            }

            const assets: BuildAsset[] = Array.from(Object.values(bundle)).map(
                (b): BuildAsset => ({
                    fileName: b.fileName,
                    name: b.name,
                }),
            )
            for (const b of Object.values(bundle)) {
                if (b.type === 'chunk') {
                    b.code = b.code.replace(random, JSON.stringify(assets))
                } else if (typeof b.source === 'string') {
                    b.source = b.source.replace(random, JSON.stringify(assets))
                }
            }
        },
    }
}
