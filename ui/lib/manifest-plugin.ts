import { Plugin } from 'vite'
import {
    FaviconOptions,
    FaviconResponse,
    favicons,
    FaviconFile,
} from 'favicons'

type WebManifest = {
    icons?: WebManifestIcon[]
}

type WebManifestIcon = {
    src: string
    sizes?: string
    type?: string
    purpose?: string
}

type Options = FaviconOptions & {
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
            f.contents,
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

                resp.write(files.get(url))
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
            for (const [name, content] of files) {
                const relName = name.slice(1)
                bundle[relName] = {
                    type: 'asset',
                    name: relName,
                    fileName: relName,
                    originalFileName: relName,
                    source: content,
                    needsCodeReference: false,
                }
            }
        },
    }
}

async function multiFavicons(options: Options): Promise<FaviconResponse> {
    const maskedPromise = favicons(options.source, {
        ...options,
        icons: {
            // ...options.icons,
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
            ...options,
            icons: {
                // ...options.icons,
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

    const maskedImages = new Set(masked.images.map(f => f.name))

    const maskedFiles = new Map(masked.files.map(f => [f.name, f.contents]))
    const maskableFiles = new Map(maskable.files.map(f => [f.name, f.contents]))
    const names = new Set([...maskableFiles.keys(), ...maskedFiles.keys()])

    for (const name of names) {
        if (name === 'manifest.webmanifest') {
            const manifest: WebManifest = JSON.parse(
                maskedFiles.get(name) ?? '',
            )
            const maskableManifest: WebManifest = JSON.parse(
                maskableFiles.get(name) ?? '',
            )

            manifest.icons = [
                ...(manifest.icons ?? []),
                ...(maskableManifest.icons ?? []).map(icon => ({
                    ...icon,
                    src: icon.src.replace('.', '-maskable.'),
                    purpose: 'maskable',
                })),
            ]

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
        ),
    }
}
