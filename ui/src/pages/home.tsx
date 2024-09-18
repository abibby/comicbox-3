import { Fragment, FunctionalComponent, h } from 'preact'
import { bookAPI } from 'src/api'
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

    if (books?.length === 0) {
        return (
            <Fragment>
                <h3>Reading</h3>
                <div>Your all caught up</div>
            </Fragment>
        )
    }

    return <BookList title='Reading' books={books} />
}

export const Latest: FunctionalComponent = () => {
    const books = useCached({
        listName: 'latest',
        request: { limit: 15, order_by: 'created_at', order: 'desc' },
        table: DB.books,
        network: bookAPI.list,
    })

    return <BookList title='Latest Books' books={books} />
}
