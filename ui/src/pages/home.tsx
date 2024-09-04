import { Fragment, FunctionalComponent, h } from 'preact'
import { useMemo } from 'preact/hooks'
import { book } from 'src/api'
import { useCached } from 'src/cache'
import { BookList } from 'src/components/book-list'
import { DB } from 'src/database'
import { useReading } from 'src/hooks/reading'

export const Home: FunctionalComponent = () => {
    return (
        <Fragment>
            <Reading />
            <Latest />
        </Fragment>
    )
}

export const Reading: FunctionalComponent = () => {
    const books = useReading()
    const orderedBooks = useMemo(
        () =>
            books?.sort((a, b) => {
                let aUpdated = a.updated_at
                if (a.user_book && a.user_book.updated_at > a.updated_at) {
                    aUpdated = a.user_book?.updated_at
                }
                let bUpdated = b.updated_at
                if (b.user_book && b.user_book.updated_at > b.updated_at) {
                    bUpdated = b.user_book?.updated_at
                }
                return bUpdated.localeCompare(aUpdated)
            }) ?? null,
        [books],
    )
    if (books?.length === 0) {
        return (
            <Fragment>
                <h3>Reading</h3>
                <div>Your all caught up</div>
            </Fragment>
        )
    }

    return <BookList title='Reading' books={orderedBooks} />
}

export const Latest: FunctionalComponent = () => {
    const books = useCached(
        'latest',
        { limit: 15, order_by: 'created_at', order: 'desc' },
        DB.books,
        book.list,
    )

    return <BookList title='Latest Books' books={books} />
}
