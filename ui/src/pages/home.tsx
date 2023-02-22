import { FunctionalComponent, h } from 'preact'
import { useEffect } from 'preact/hooks'
import { book, series } from 'src/api'
import { SeriesListRequest } from 'src/api/series'
import { updateList, useCached } from 'src/cache'
import { BookList } from 'src/components/book-list'
import { DB, DBSeries } from 'src/database'

export const Home: FunctionalComponent = () => {
    useEffect(() => {
        updateList<DBSeries, SeriesListRequest>(
            'series',
            {},
            DB.series,
            series.list,
        )
    }, [])

    return (
        <div>
            <Reading />
            <Latest />
        </div>
    )
}

export const Reading: FunctionalComponent = () => {
    const books = useCached('reading', {}, DB.books, book.reading)

    if (books?.length === 0) {
        return (
            <div>
                <h1>Reading</h1>
                <div>Your all caught up</div>
            </div>
        )
    }

    return (
        <div>
            <h1>Reading</h1>
            <BookList books={books} />
        </div>
    )
}

export const Latest: FunctionalComponent = () => {
    const books = useCached(
        'latest',
        { limit: 15, order_by: 'created_at', order: 'desc' },
        DB.books,
        book.list,
    )

    return (
        <div>
            <h1>Latest Books</h1>
            <BookList books={books} />
        </div>
    )
}
