import Dexie, { Collection } from 'dexie'
import { book } from 'src/api'
import { setCacheHandler } from 'src/cache/internal'
import { DB } from 'src/database'
import { Book } from 'src/models'

setCacheHandler(book.list, async (req): Promise<Book[]> => {
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
    } else if (req.series !== undefined) {
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

// setCacheHandler(book.reading, async (): Promise<Book[]> => {
//     const s = await DB.series
//         .where('user_series.list')
//         .equals('reading')
//         .toArray()

//     const bookPromises = s.map(s =>
//         DB.books
//             .where(['series', 'completed', 'sort'])
//             .between([s.name, 0, Dexie.minKey], [s.name, 0, Dexie.maxKey])
//             .first(),
//     )

//     const books = await Promise.all(bookPromises)

//     return books.filter(notNullish)
// })
