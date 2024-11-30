import Dexie, { Collection } from 'dexie'
import { bookAPI } from 'src/api'
import { setCacheHandler } from 'src/cache/internal'
import { DB } from 'src/database'
import { Book } from 'src/models'

setCacheHandler(bookAPI.list, async (req): Promise<Book[]> => {
    if (req.id !== undefined) {
        return DB.books.where('id').equals(req.id).toArray()
    }
    let collection: Collection<Book, string> | undefined
    let beforeSort = Dexie.maxKey
    let afterSort: string | number = Dexie.minKey

    if (req.after_id !== undefined) {
        const b = await DB.books.where('id').equals(req.after_id).first()
        if (b === undefined) {
            return []
        }
        afterSort = b.sort
    }
    if (req.before_id !== undefined) {
        const b = await DB.books.where('id').equals(req.before_id).first()
        if (b === undefined) {
            return []
        }
        beforeSort = b.sort
    }
    if (req.order_by === 'created_at') {
        collection = DB.books.orderBy('created_at')
    } else if (req.series_slug !== undefined) {
        collection = DB.books
            .where(['series_slug', 'sort'])
            .between(
                [req.series_slug, afterSort],
                [req.series_slug, beforeSort],
                false,
                false,
            )
    }

    if (collection === undefined) {
        collection = DB.books.where('sort').between(afterSort, beforeSort)
    }

    if (req.limit !== undefined) {
        collection = collection.limit(req.limit)
    }
    if (req.order === 'desc') {
        collection = collection.reverse()
    }

    const books = await collection.toArray()

    if (req.with_series) {
        const seriesSlugs = Array.from(new Set(books.map(b => b.series_slug)))
        const series = new Map(
            await Promise.all(
                seriesSlugs.map(
                    async slug =>
                        [
                            slug,
                            await DB.series.where('slug').equals(slug).first(),
                        ] as const,
                ),
            ),
        )
        for (const book of books) {
            book.series = series.get(book.series_slug) ?? null
        }
    }

    return books
})
