import { FunctionalComponent, h } from 'preact'
import { book } from 'src/api'
import { useCached } from 'src/cache'
import { BookList } from 'src/components/book-list'
import { DB } from 'src/database'
import { useReading } from 'src/hooks/reading'

export const Home: FunctionalComponent = () => {
    return (
        <div>
            <Reading />
            <Latest />
        </div>
    )
}

export const Reading: FunctionalComponent = () => {
    const books = useReading()
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
