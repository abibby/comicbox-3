import Dexie, { Collection } from 'dexie'
import { book } from '../api'
import { DB } from '../database'
import { Book } from '../models'
import { setCacheHandler } from './internal'

setCacheHandler(book.list, async (req): Promise<Book[]> => {
    if (req.id !== undefined) {
        return DB.books.where('id').equals(req.id).toArray()
    }
    let collection: Collection<Book, number> | undefined
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
    if (req.series !== undefined) {
        collection = DB.books
            .where(['series', 'sort'])
            .between(
                [req.series, afterSort],
                [req.series, beforeSort],
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

    return collection.toArray()
})

function notNullish<T>(v: T | null | undefined): v is T {
    return v !== null && v !== undefined
}

setCacheHandler(book.reading, async (): Promise<Book[]> => {
    const s = await DB.series
        .where('user_series.list')
        .equals('reading')
        .toArray()

    const bookPromises = s.map(s =>
        DB.books
            .where(['series', 'completed', 'sort'])
            .between([s.name, 0, Dexie.minKey], [s.name, 0, Dexie.maxKey])
            .first(),
    )
    const books = await Promise.all(bookPromises)
    return books.filter(notNullish)
})
