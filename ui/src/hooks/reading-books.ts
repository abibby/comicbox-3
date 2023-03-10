import Dexie from 'dexie'
import chunk from 'lodash.chunk'
import { useEffect, useState } from 'preact/hooks'
import { book, series } from 'src/api'
import { useCached } from 'src/cache'
import { DB, DBBook } from 'src/database'
import { Book } from 'src/models'
import { newTestBook } from 'src/test/book'
import { notNullish } from 'src/utils/not-nullish'

export function useReadingBooks(): Book[] | null {
    const readingSeries = useCached(
        'reading:with_latest_book',
        { list: 'reading' },
        DB.series,
        series.list,
    )

    const [books, setBooks] = useState<DBBook[] | null>(null)

    useEffect(() => {
        const readingBookIDs =
            readingSeries
                ?.map(s => s.user_series?.latest_book_id)
                .filter(notNullish) ?? []

        fetchBooks(readingBookIDs).then(async readingBooks => {
            setBooks(readingBooks)
            await DB.fromNetwork(DB.books, readingBooks)
            await updateBooks(readingBooks)
        })

        DB.books.bulkGet(readingBookIDs).then(readingBooks => {
            setBooks(
                readingBooks.map(
                    (b, i) =>
                        b ??
                        newTestBook({
                            series:
                                readingSeries?.find(
                                    s =>
                                        s.user_series?.latest_book_id ===
                                        readingBookIDs[i],
                                )?.name ?? 'unknown',
                        }),
                ),
            )
        })
    }, [readingSeries])

    return books
}

async function fetchBooks(ids: string[]): Promise<Book[]> {
    if (ids.length === 0) {
        return []
    }
    const bookChunks = await Promise.all(
        chunk(ids, 50).map(ids =>
            book.listPaged({
                ids: ids,
                page: 1,
                page_size: ids.length,
            }),
        ),
    )
    return bookChunks.flatMap(c => c.data)
}

async function updateBooks(books: Book[]): Promise<void> {
    const readingSeries = await DB.series
        .where('user_series.list')
        .equals('reading')
        .toArray()

    for (const s of readingSeries) {
        const b = books.find(b => b.series === s.name)
        const seriesBooks = await DB.books
            .where(['series', 'completed', 'sort'])
            .between(
                [s.name, 0, Dexie.minKey],
                [s.name, 0, b?.sort ?? Dexie.maxKey],
            )
            .toArray()

        for (const b of seriesBooks) {
            await DB.saveBook(
                b,
                {
                    user_book: {
                        current_page: b.page_count,
                    },
                },
                false,
            )
        }
    }
}
