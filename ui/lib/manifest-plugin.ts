import { Plugin, UserConfig, Connect } from 'vite'
import parseHTML from 'node-html-parser'
import { readFile } from 'fs/promises'
import { PluginContext } from 'rollup'
import { relative, resolve } from 'path'
import generateFavicons, { FaviconResponse } from 'favicons'

export default function manifestPlugin(): Plugin {
    let manifestPrefix = 'manifest-plugin-prefix:'
    const [ctxPromise, setCtx] = newSplitPromise<PluginContext>()

    const cache = new AssetCache(ctxPromise)
    return {
        name: 'manifest-plugin',
        enforce: 'post',
        config(cfg) {
            cache.init(cfg)
        },
        buildStart() {
            setCtx(this)
        },
        async watchChange(id) {
            await cache.invalidate(id)
        },
        configureServer(server) {
            cache.isServer = true
            server.middlewares.use(cache.middleware)
            manifestPrefix = ''
        },
        transformIndexHtml: {
            order: 'pre',
            async handler(html, htmlCtx) {
                const htmlFile = htmlCtx.filename
                const document = parseHTML(html)
                const ctx = await ctxPromise

                const manifestLinkElements = document.querySelectorAll(
                    'link[rel="manifest"][href]',
                )

                const htmlIDs = []

                for (const e of manifestLinkElements) {
                    const manifestHref = e.getAttribute('href')
                    if (manifestHref === undefined) {
                        continue
                    }

                    const manifest = await ctx.resolve(manifestHref, htmlFile)
                    if (!manifest) {
                        ctx.error('could not resolve manifest')
                        return
                    }

                    let manifestRef: string | undefined
                    const htmlID = 'html:' + manifest.id
                    htmlIDs.push(htmlID)
                    if (!cache.has(manifest.id)) {
                        const resp = await buildManifest(ctx, manifest.id)

                        ctx.addWatchFile(manifest.id)

                        for (const f of [...resp.files, ...resp.images]) {
                            let importer: string
                            let assetID: string

                            if (f.name == 'manifest.webmanifest') {
                                assetID = manifest.id
                                importer = htmlFile
                            } else {
                                const resolved = await ctx.resolve(
                                    f.name,
                                    manifest.id,
                                )
                                assetID = resolved?.id ?? f.name
                                importer = manifest.id
                            }
                            const ref = await cache.addAsset(
                                assetID,
                                f.contents,
                                importer,
                            )
                            if (f.name == 'manifest.webmanifest') {
                                manifestRef = ref
                            }
                        }
                        await cache.addAsset(
                            htmlID,
                            resp.html
                                .filter(
                                    line =>
                                        !line.startsWith(
                                            '<link rel="manifest"',
                                        ),
                                )
                                .join('\n'),
                            manifest.id,
                        )
                    }
                    e.setAttribute(
                        'href',
                        manifestPrefix +
                            cache.getURL(manifestRef ?? manifest.id),
                    )
                }
                const head = document.querySelector('head')
                if (head) {
                    let headHTML = head.innerHTML
                    for (const htmlID of htmlIDs) {
                        headHTML += cache.get(htmlID) + '\n'
                    }
                    head.innerHTML = headHTML
                }

                return document.outerHTML
            },
        },
        async generateBundle(_, bundle) {
            const index = bundle['index.html']
            if (index?.type === 'asset' && manifestPrefix !== '') {
                index.source = index.source
                    .toString()
                    .replaceAll(manifestPrefix, '')
            }
        },
    }
}

class AssetCache {
    private assets = new Map<string, string | Buffer>()
    private deps = new Map<string, string[]>()
    private urls = new Map<string, string>()

    private projectRoot = process.cwd()

    public isServer = false

    constructor(private readonly ctxPromise: Promise<PluginContext>) {}

    public init(cfg: UserConfig) {
        if (cfg.root) {
            this.projectRoot = resolve()
        }
    }

    public async addAsset(
        id: string,
        source: string | Buffer,
        importer: string,
    ): Promise<string> {
        this.assets.set(id, source)
        this.urls.set(await this.getURL(id), id)

        let d = this.deps.get(importer)
        if (d === undefined) {
            d = []
            this.deps.set(importer, d)
        }
        d.push(id)
        if (this.isServer) {
            return id
        }
        const ctx = await this.ctxPromise

        const path = this.getPath(id)
        ctx.emitFile({
            type: 'asset',
            fileName: path,
            originalFileName: id,
            source: source,
        })
        return path
    }

    public has(id: string) {
        return this.assets.has(id)
    }

    public getURL(id: string): string {
        if (this.isServer) {
            return '/' + relative(this.projectRoot, id)
        }
        return this.getPath(id)
    }
    private getPath(id: string): string {
        return id.slice(id.lastIndexOf('/') + 1)
    }
    public get(id: string): string | Buffer | undefined {
        return this.assets.get(id)
    }

    public middleware: Connect.NextHandleFunction = async (req, resp, next) => {
        const id = this.urls.get(req.url ?? '')

        if (id === undefined) {
            next()
            return
        }

        resp.write(this.assets.get(id))
        resp.end()
    }

    public async invalidate(id: string): Promise<void> {
        const ds = this.deps.get(id)
        for (const d of ds ?? []) {
            await this.invalidate(d)
        }

        this.deps.delete(id)
        this.assets.delete(id)
        this.urls.delete(await this.getURL(id))
    }
    // public async emitFiles() {
    //     const ctx = await this.ctxPromise
    //     for (const [id, contents] of this.assets) {
    //         ctx.emitFile({
    //             type: 'asset',
    //             fileName: id.slice(id.lastIndexOf('/') + 1),
    //             originalFileName: id,
    //             source: contents,
    //         })
    //     }
    // }
}

type ManifestIcon = {
    src: string
    size?: string
    purpose?: string
}

async function buildManifest(
    ctx: PluginContext,
    id: string,
): Promise<FaviconResponse> {
    const src = await readFile(id)
    const manifest: unknown = JSON.parse(src.toString())
    if (!(manifest instanceof Object) || manifest === null) {
        throw new Error('invalid manifest')
    }
    if (!('icons' in manifest)) {
        throw new Error('no icons')
    }

    let srcIcons: ManifestIcon[] = []
    if (manifest.icons instanceof Array) {
        srcIcons = manifest.icons.map(i => {
            if (typeof i === 'string') {
                return { src: i }
            }
            return i
        })
    }

    let resp: FaviconResponse = {
        files: [],
        html: [],
        images: [],
    }

    let icons: ManifestIcon[] = []
    for (const icon of srcIcons) {
        const iconRef = await ctx.resolve(icon.src, id)
        if (iconRef === null) {
            throw new Error('invalid icon')
        }
        // console.log(toFaviconsOptions(manifest))

        const isMaskable = icon.purpose == 'maskable'

        const iconResp = await generateFavicons(iconRef.id, {
            manifestMaskable: isMaskable,
            icons: {
                android: true,
                appleIcon: isMaskable,
                appleStartup: false,
                favicons: !isMaskable,
                windows: false,
                yandex: false,
            },
        })

        let html = resp.html
        if (icon.purpose === 'maskable') {
            html = html.concat(iconResp.html)
        }
        const manifestFile = iconResp.files.find(
            f => f.name === 'manifest.webmanifest',
        )
        if (manifestFile) {
            const iconManifest = JSON.parse(manifestFile.contents)
            icons = icons.concat(
                iconManifest.icons.map((i: ManifestIcon) => ({
                    ...i,
                    src: isMaskable ? '/maskable-' + i.src.slice(1) : i.src,
                    purpose: icon.purpose ?? 'any',
                })),
            )
        }
        resp = {
            html: html,
            files: resp.files
                .concat(iconResp.files)
                .filter(f => f.name !== 'manifest.webmanifest'),
            images: resp.images.concat(
                iconResp.images.map(f => ({
                    name: isMaskable ? 'maskable-' + f.name : f.name,
                    contents: f.contents,
                })),
            ),
        }
    }

    manifest.icons = icons

    resp = {
        html: resp.html,
        files: resp.files.concat([
            {
                name: 'manifest.webmanifest',
                contents: JSON.stringify(manifest, undefined, '    '),
            },
        ]),
        images: resp.images,
    }

    return resp
}

function newSplitPromise<T>(): [
    Promise<T>,
    (v: T) => void,
    (err: Error) => void,
] {
    let res: (v: T) => void
    let rej: (err: Error) => void
    const p = new Promise<T>((resolve, reject) => {
        res = resolve
        rej = reject
    })

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return [p, res, rej]
}
