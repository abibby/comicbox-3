import { Plugin } from 'vite'
import {
    FaviconOptions,
    FaviconResponse,
    favicons,
    FaviconFile,
    FaviconImage,
} from 'favicons'
import { WebManifest } from 'lib/webmanifest'
import { basename } from 'node:path'
import { readFile } from 'node:fs/promises'
import { imageSize } from 'image-size'

type Options = WebManifest & {
    source: string
    maskableSource?: string
}

export default async function manifestPlugin(
    options: Options,
): Promise<Plugin> {
    // const projectRoot = process.cwd()

    const faviconResponse = await multiFavicons(options)
    const files = new Map(
        [...faviconResponse.files, ...faviconResponse.images].map(f => [
            '/' + f.name,
            f,
        ]),
    )

    return {
        name: 'manifest-plugin',

        configureServer(server) {
            server.middlewares.use(async (req, resp, next) => {
                const url = req.url
                if (!url || !files.has(url)) {
                    next()
                    return
                }

                resp.write(files.get(url)?.contents)
                resp.end()
                return
            })
        },

        async transformIndexHtml(html) {
            return html.replace(
                '</head>',
                faviconResponse.html.join('\n') + '\n</head>',
            )
        },

        async generateBundle(_options, bundle) {
            for (const [name, file] of files) {
                const relName = name.slice(1)
                bundle[relName] = {
                    type: 'asset',
                    name: relName,
                    names: [relName],
                    fileName: relName,
                    originalFileName: relName,
                    originalFileNames: [relName],
                    source: file.contents,
                    needsCodeReference: false,
                }
            }
        },
    }
}

async function multiFavicons(options: Options): Promise<FaviconResponse> {
    const faviconOptions: FaviconOptions = {
        appName: options.name,
        appShortName: options.short_name,
        appDescription: options.description,
        background: options.background_color,
        theme_color: options.theme_color,
    }
    const maskedPromise = favicons(options.source, {
        ...faviconOptions,
        icons: {
            android: true,
            appleIcon: options.maskableSource === undefined,
            appleStartup: true,
            favicons: true,
            yandex: false,
            windows: false,
        },
    })
    let maskablePromise: Promise<FaviconResponse> | undefined
    if (options.maskableSource) {
        maskablePromise = favicons(options.maskableSource, {
            ...faviconOptions,
            icons: {
                android: true,
                appleIcon: true,
                appleStartup: false,
                favicons: false,
                yandex: false,
                windows: false,
            },
        })
    }

    const masked = await maskedPromise
    const maskable = await maskablePromise

    if (!maskable) {
        return masked
    }

    const files: FaviconFile[] = []
    const screenshots: FaviconImage[] = []

    const maskedImages = new Set(masked.images.map(f => f.name))

    const maskedFiles = new Map(masked.files.map(f => [f.name, f.contents]))
    const maskableFiles = new Map(maskable.files.map(f => [f.name, f.contents]))
    const names = new Set([...maskableFiles.keys(), ...maskedFiles.keys()])

    for (const name of names) {
        if (name === 'manifest.webmanifest') {
            const manifest = {
                ...options,
                source: undefined,
                maskableSource: undefined,
            }
            const iconManifest: WebManifest = JSON.parse(
                maskedFiles.get(name) ?? '',
            )
            const maskableManifest: WebManifest = JSON.parse(
                maskableFiles.get(name) ?? '',
            )

            manifest.icons = [
                ...(iconManifest.icons ?? []),
                ...(maskableManifest.icons ?? []).map(icon => ({
                    ...icon,
                    src: icon.src.replace('.', '-maskable.'),
                    purpose: 'maskable',
                })),
            ]

            manifest.screenshots = await Promise.all(
                manifest.screenshots?.map(async screenshot => {
                    const name = basename(screenshot.src)
                    const contents = await readFile(screenshot.src)
                    screenshots.push({
                        name: name,
                        contents: contents,
                    })
                    const size = imageSize(contents)

                    screenshot.src = '/' + name
                    screenshot.sizes = `${size.width}x${size.height}`

                    return screenshot
                }) ?? [],
            )

            files.push({
                name: name,
                contents: JSON.stringify(manifest, undefined, '    '),
            })
        } else {
            files.push({
                name: name,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                contents: maskedFiles.get(name) ?? maskableFiles.get(name)!,
            })
        }
    }

    return {
        html: Array.from(new Set(masked.html.concat(maskable.html))),
        files: files,
        images: masked.images.concat(
            maskable.images.map(f => ({
                name: maskedImages.has(f.name)
                    ? f.name.replace('.', '-maskable.')
                    : f.name,
                contents: f.contents,
            })),
            screenshots,
        ),
    }
}
