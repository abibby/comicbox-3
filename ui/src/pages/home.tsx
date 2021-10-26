import { FunctionalComponent, h } from 'preact'
import { useEffect } from 'preact/hooks'
import { book, series } from '../api'
import { updateList, useCached } from '../cache'
import { BookList } from '../components/book-list'
import { DB } from '../database'

export const Home: FunctionalComponent = () => {
    useEffect(() => {
        updateList('series', {}, DB.series, series.list)
    })
    const books = useCached('reading', {}, DB.books, book.reading)

    if (books?.length === 0) {
        return (
            <div>
                <h1>Home</h1>
                <div>Your all caught up</div>
            </div>
        )
    }

    return (
        <div>
            <h1>Home</h1>
            <BookList books={books} />
        </div>
    )
}
