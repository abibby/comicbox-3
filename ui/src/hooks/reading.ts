import Dexie from 'dexie'
import { series } from 'src/api'
import { useCached } from 'src/cache'
import { setCacheHandler } from 'src/cache/internal'
import { DB } from 'src/database'
import { Book, List } from 'src/models'
import { notNullish } from 'src/util'

async function readingBooks(): Promise<Book[]> {
    const s = await series.list({
        with_latest_book: true,
        list: List.Reading,
    })
    const books = s.map(s => s.latest_book).filter(notNullish)

    await Promise.all(
        s.map(async readingSeries => {
            let sort: string | void[][] = Dexie.maxKey
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

    DB.fromNetwork(
        DB.series,
        s.map(s => ({ ...s, latest_book: null, latest_book_id: null })),
    )

    return books
}

setCacheHandler(readingBooks, async (): Promise<Book[]> => {
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

export function useReading(): Book[] | null {
    return useCached('reading', {}, DB.books, readingBooks)
}
