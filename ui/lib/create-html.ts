import { readFile } from 'fs/promises'
import { render } from 'mustache'
import { Plugin, PluginContext } from 'rollup'

interface Options {
    templatePath: string
    output: string
    shellJSPath: string
    shellCSSPath: string
    iconPath: string
}
export default function createHTMLPlugin(options: Options): Plugin {
    const { templatePath, output, shellJSPath, shellCSSPath, iconPath } =
        options
    return {
        name: 'create-html-plugin',
        buildStart() {
            this.addWatchFile(templatePath)
            this.addWatchFile(shellJSPath)
            this.addWatchFile(shellCSSPath)
            this.addWatchFile(iconPath)
        },
        async generateBundle(options, bundle) {
            // const faviconsPromise = generateFavicons(iconPath, {})
            const template = await readFile(templatePath).then(f =>
                f.toString(),
            )

            const scripts = Object.values(bundle)
                .filter(f => f.type === 'chunk' && f.isEntry)
                .map(
                    f => `<script src="/${f.fileName}" type="module"></script>`,
                )
                .join('')

            const styles = Object.values(bundle)
                .filter(f => f.fileName.endsWith('.css'))
                .map(f => `<link rel="stylesheet" href="/${f.fileName}">`)
                .join('')

            // const shellCSS = await readFile(
            //     await resolveFile(this, shellCSSPath),
            // )

            // const shell: string = (
            //     await import(await resolveFile(this, shellJSPath))
            // ).shell

            // const r = await faviconsPromise

            // for (const image of [...r.images, ...r.files]) {
            //     bundle[image.name] = {
            //         name: undefined,
            //         type: 'asset',
            //         fileName: image.name,
            //         isAsset: true,
            //         source: image.contents,
            //     }
            // }

            // let shellCSS = ''
            // const css = bundle[shellCSSPath]
            // if (css?.type === 'asset') {
            //     writeFile('./test.css', css.source.toString())
            //     shellCSS = css.source.toString()
            // }

            const variables = {
                scripts: scripts,
                styles: styles,
                // styles: styles + `<style>${shellCSS}</style>`,
                // header: r.html.join(''),
                header: '',
                // shell: shell,
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

function resolveFile(plugin: PluginContext, path: string): Promise<string> {
    return plugin.resolve(path).then(f => f?.id ?? '')
}
