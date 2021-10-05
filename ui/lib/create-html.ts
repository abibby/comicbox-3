import { readFile } from 'fs/promises';
import { render } from 'mustache';
import { Plugin, PluginContext } from 'rollup';

interface Options {
    templatePath: string
    output: string
    shellJSPath: string
    shellCSSPath: string
}
export default function createHTMLPlugin(options: Options): Plugin {
    const { templatePath, output, shellJSPath, shellCSSPath } = options
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
                .map(f => `<script src="/${f.fileName}" type="module"></script>`)
                .join('')

            const styles = Object.values(bundle)
                .filter(f => f.fileName.endsWith('.css'))
                .map(f => `<link rel="stylesheet" href="/${f.fileName}">`)
                .join('')

            const shellCSS = await readFile(await resolveFile(this, shellCSSPath))

            const shell: string = (await import(await resolveFile(this, shellJSPath))).shell

            const variables = { 
                scripts: scripts,
                styles: styles+`<style>${shellCSS}</style>`,
                shell: shell,
            }

            bundle[output] = {
                name: undefined,
                type: 'asset',
                fileName: output,
                isAsset: true,
                source: render(template, variables),
            }
        },
    }
}

function resolveFile(plugin: PluginContext, path: string): Promise<string>{
    return plugin.resolve(path).then(f => f?.id ?? '')
}
