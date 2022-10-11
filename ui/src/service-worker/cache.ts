import { pageURL } from 'src/api'
import { openPageCache, openThumbCache } from 'src/caches'
import { respond } from 'src/message'
import { Book } from 'src/models'
import { Progressor } from 'src/service-worker/progressor'

async function cacheBook(b: Book): Promise<void> {
    const progressor = new Progressor(b.pages.length + 1, 'book', b.id)
    await progressor.start()

    const thumbCache = await openThumbCache()
    thumbCache.add(await pageURL(b))
    await progressor.next()

    const pageCache = await openPageCache(b.id)
    await Promise.all(
        b.pages.map(async p => {
            await pageCache.add(await pageURL(p))
            await progressor.next()
        }),
    )
    await progressor.finish()
}

export async function cacheBooks(
    event: ExtendableMessageEvent,
    books: Book[],
): Promise<void> {
    for (const b of books) {
        await cacheBook(b)
    }
    respond(event, { type: 'book-update' })
}
