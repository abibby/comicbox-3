import { bookAPI, pageURL } from 'src/api'
import { metadataUpdate } from 'src/api/metadata'
import { backgroundFetch } from 'src/background-fetch'
import { invalidateCache } from 'src/cache'
import { DB } from 'src/database'
import { Series } from 'src/models'
import icon from 'res/images/logo.svg'
import { sendCacheUpdate } from 'src/caches'
import { downloadBook } from './book-service'

export async function updateSeriesMetadata(slug: string): Promise<void> {
    const s = await metadataUpdate(slug)
    await DB.fromNetwork([s])
    invalidateCache(true)
}

export async function downloadSeries(series: Series): Promise<void> {
    const books = await bookAPI.list({
        series_slug: series.slug,
        // unread: true,
        after_id: series.user_series?.latest_book_id ?? undefined,
        limit: null,
    })
    if (series.user_series?.latest_book) {
        books.push(series.user_series?.latest_book)
    }
    if (books.length === 0) {
        return
    }
    const pages: string[] = []
    for (const book of books) {
        const bookPages = await Promise.all([
            pageURL(book),
            ...book.pages.map(p => pageURL(p)),
        ])
        pages.push(...bookPages)
    }

    const reg = await backgroundFetch().fetch(series.slug, pages, {
        title: series.name,
        // downloadTotal: book.size,
        icons: [{ src: icon }],
    })
    for (const book of books) {
        await sendCacheUpdate({
            type: 'download',
            downloadType: 'progress',
            id: book.id,
            model: 'book',
            progress: 0,
        })

        reg.addEventListener('progress', async () => {
            if (reg.downloadTotal) {
                await sendCacheUpdate({
                    type: 'download',
                    downloadType: 'progress',
                    id: book.id,
                    model: 'book',
                    progress: reg.downloaded / reg.downloadTotal,
                })
            }
            if (reg.result === 'success') {
                await sendCacheUpdate({
                    type: 'download',
                    downloadType: 'progress',
                    id: book.id,
                    model: 'book',
                    progress: 1,
                })
            }
        })
    }
}
