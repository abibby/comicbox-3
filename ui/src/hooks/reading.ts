import Dexie from 'dexie'
import { seriesAPI } from 'src/api'
import { useCached } from 'src/cache'
import { setCacheHandler } from 'src/cache/internal'
import { DB } from 'src/database'
import { Book, SeriesOrder } from 'src/models'
import { notNullish } from 'src/util'

async function readingBooks(): Promise<Book[]> {
    const s = await seriesAPI.list({
        order_by: SeriesOrder.LastRead,
        with_latest_book: true,
        list: 'reading',
    })
    const books = s.map(s => s.latest_book).filter(notNullish)

    await DB.fromNetwork(
        DB.series,
        s.map(s => ({ ...s, latest_book: null, latest_book_id: null })),
    )

    await Promise.all(
        s.map(async readingSeries => {
            let sort = Dexie.maxKey
            if (readingSeries.latest_book !== null) {
                sort = readingSeries.latest_book.sort
            }
            const seriesBooks = await DB.books
                .where(['series', 'completed', 'sort'])
                .between(
                    [readingSeries.name, 0, Dexie.minKey],
                    [readingSeries.name, 0, sort],
                )
                .toArray()

            for (const b of seriesBooks) {
                await DB.saveBook(
                    b,
                    {
                        user_book: {
                            current_page: b.page_count - 1,
                        },
                    },
                    false,
                )
            }
        }),
    )

    return books
}

setCacheHandler(readingBooks, async (): Promise<Book[]> => {
    const s = await DB.series
        .where('user_series.list')
        .equals('reading')
        .toArray()

    s.sort((a, b) => {
        if (!a.user_series && !b.user_series) {
            return 0
        }
        if (!a.user_series) {
            return 1
        }
        if (!b.user_series) {
            return -1
        }
        return b.user_series.last_read_at.localeCompare(
            a.user_series.last_read_at,
        )
    })

    const bookPromises = s.map(s =>
        DB.books
            .where(['series', 'completed', 'sort'])
            .between([s.name, 0, Dexie.minKey], [s.name, 0, Dexie.maxKey])
            .first(),
    )

    const books = await Promise.all(bookPromises)

    return books.filter(notNullish)
})

export function useReading(): Book[] | null {
    return useCached({
        listName: 'reading',
        request: {},
        table: DB.books,
        network: readingBooks,
    })
}
