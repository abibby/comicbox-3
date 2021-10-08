import { FunctionalComponent, h } from 'preact'
import { book } from '../api'
import { useAsync } from '../hooks/async'
import { BookCard } from './book'
import styles from './book-list.module.css'

interface BookListProps {

}

export const BookList: FunctionalComponent<BookListProps> = props => {
    const books = useAsync(() => book.list(), [])
    if (books.loading) {
        return <div>loading</div>
    }
    if (books.error) {
        return <div>Error {books.error.message}</div>
    }
    return <div class={styles.bookList}>
        {books.result.data.map(b => <BookCard book={b} />)}
    </div>
}
