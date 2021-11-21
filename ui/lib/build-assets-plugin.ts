import { Plugin } from 'rollup'

const random = JSON.stringify(
    `4A4rwiR8VuNWLmjcaFQgP5ZqsP6nswBjUcs5fKtySldpYcfkoNOpafMSJ7p5VDp09iRcU2cRZ`,
)

export default function buildAssetPlugin(): Plugin {
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

            // console.log(this.getModuleIds())
            return `export default ${random}`
        },

        async generateBundle(options, bundle) {
            for (const [file, b] of Object.entries(bundle)) {
                if (file !== 'service-worker.js') {
                    continue
                }
                if (b.type === 'chunk' && path in b.modules) {
                    b.code = b.code.replace(
                        random,
                        JSON.stringify(Object.keys(bundle)),
                    )
                }
            }
            // console.log(options, Object.keys(bundle))
        },
    }
}
