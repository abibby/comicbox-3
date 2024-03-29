import generateFavicons, { FaviconOptions } from 'favicons'
import { readFile } from 'fs/promises'
import { render } from 'mustache'
import { Plugin } from 'rollup'

interface Options {
    templatePath: string
    output: string
    shellJSPath: string
    shellCSSPath: string
    iconPath: string
    appleIconPath: string
    manifestPath: string
}
export default function createHTMLPlugin(options: Options): Plugin {
    const {
        templatePath,
        output,
        shellJSPath,
        shellCSSPath,
        iconPath,
        appleIconPath,
        manifestPath,
    } = options
    return {
        name: 'create-html-plugin',
        buildStart() {
            this.addWatchFile(templatePath)
            this.addWatchFile(shellJSPath)
            this.addWatchFile(shellCSSPath)
            this.addWatchFile(iconPath)
            this.addWatchFile(manifestPath)
        },
        async generateBundle(options, bundle) {
            const [template, manifest] = await Promise.all([
                readFile(templatePath).then(f => f.toString()),
                readFile(manifestPath).then(f => JSON.parse(f.toString())),
            ])
            const faviconOptions: Partial<FaviconOptions> = {
                ...manifest,
                background: manifest.background_color,
                appDescription: manifest.description,
                appName: manifest.name,
                appShortName: manifest.short_name,
                appleStatusBarStyle: 'default',
            }
            const faviconsPromise = generateFavicons(iconPath, {
                ...faviconOptions,
                icons: {
                    android: true,
                    appleIcon: false,
                    appleStartup: false,
                    coast: false,
                    favicons: false,
                    firefox: false,
                    windows: false,
                    yandex: false,
                },
            })
            const appleFaviconsPromise = generateFavicons(appleIconPath, {
                ...faviconOptions,
                icons: {
                    android: false,
                    appleIcon: true,
                    appleStartup: false,
                    coast: false,
                    favicons: false,
                    firefox: false,
                    windows: false,
                    yandex: false,
                },
            })

            const scripts = Object.values(bundle)
                .filter(
                    f => f.type === 'chunk' && f.isEntry && f.name === 'app',
                )
                .map(f => `<script defer src="/${f.fileName}"></script>`)
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

            const r = await faviconsPromise
            const ar = await appleFaviconsPromise

            for (const image of [
                ...r.images,
                ...r.files,
                ...ar.files,
                ...ar.images,
            ]) {
                bundle[image.name] = {
                    name: undefined,
                    type: 'asset',
                    fileName: image.name,
                    isAsset: true,
                    source: image.contents,
                }
            }

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
                header: [...r.html, ...ar.html].join(''),
                // header: '',
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
