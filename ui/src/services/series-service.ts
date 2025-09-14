import { bookAPI, pageURL } from 'src/api'
import { metadataUpdate } from 'src/api/metadata'
import { backgroundFetch } from 'src/background-fetch'
import { invalidateCache } from 'src/cache'
import { DB } from 'src/database'
import { Series } from 'src/models'
import icon from 'res/images/logo.svg'

export async function updateSeriesMetadata(slug: string): Promise<void> {
    const s = await metadataUpdate(slug)
    await DB.fromNetwork([s])
    invalidateCache(true)
}

export async function downloadSeries(series: Series): Promise<void> {
    const books = await bookAPI.list({
        series_slug: series.slug,
        unread: true,
        limit: null,
    })
    if (books.length === 0) {
        return
    }
    const pages: string[] = []
    for (const book of books) {
        pages.push(
            ...(await Promise.all([
                pageURL(book),
                ...book.pages.map(p => pageURL(p)),
            ])),
        )
    }
    await backgroundFetch(series.slug, pages, {
        title: series.name,
        // downloadTotal: book.size,
        icons: [{ src: icon }],
    })
    // await sendCacheUpdate({
    //     type: 'download',
    //     downloadType: 'progress',
    //     id: book.id,
    //     model: 'book',
    //     progress: 0,
    // })

    // reg.addEventListener('progress', async () => {
    //     if (reg.downloadTotal) {
    //         await sendCacheUpdate({
    //             type: 'download',
    //             downloadType: 'progress',
    //             id: book.id,
    //             model: 'book',
    //             progress: reg.downloaded / reg.downloadTotal,
    //         })
    //     }
    //     if (reg.result === 'success') {
    //         await sendCacheUpdate({
    //             type: 'download',
    //             downloadType: 'progress',
    //             id: book.id,
    //             model: 'book',
    //             progress: 1,
    //         })
    //     }
    // })
}
