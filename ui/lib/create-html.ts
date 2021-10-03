import { readFile } from 'fs/promises'
import { render } from 'mustache'
import { Plugin } from 'rollup'

interface Options {
    templatePath: string
    output: string
}
export default function createHTMLPlugin(options: Options): Plugin {
    const { templatePath, output } = options
    return {
        name: 'create-html-plugin',
        buildStart() {
            this.addWatchFile(templatePath)
        },
        async generateBundle(options, bundle) {
            const template = await readFile(templatePath).then(f =>
                f.toString(),
            )

            const scripts = Object.values(bundle)
                .filter(f => f.type === 'chunk' && f.isEntry)
                .map(f => `<script src="${f.fileName}" type="module"></script>`)
                .join('')

            bundle[output] = {
                name: undefined,
                type: 'asset',
                fileName: output,
                isAsset: true,
                source: render(template, { scripts: scripts }),
            }
        },
    }
}
