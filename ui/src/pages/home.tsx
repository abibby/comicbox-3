import { FunctionalComponent, h } from 'preact'
import { book } from '../api'
import { BookList } from '../components/book-list'
import { DB } from '../database'
import { useCached } from '../hooks/cached'

export const Home: FunctionalComponent = () => {
    const books = useCached(
        'reading',
        {},
        DB.books,
        book.reading,
        book.cachedList,
    )

    if (books === null) {
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
