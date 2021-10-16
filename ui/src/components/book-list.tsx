import { FunctionalComponent, h } from 'preact'
import { book } from '../api'
import { DB } from '../database'
import { useCached } from '../hooks/cached'
import { BookCard } from './book-card'
import styles from './book-list.module.css'

interface BookListProps {
    listName: string
    series?: string
}

export const BookList: FunctionalComponent<BookListProps> = props => {
    const books = useCached(
        props.listName,
        { series: props.series },
        DB.books,
        book.list,
        book.cachedList,
    )

    if (books === null) {
        return <div class={styles.bookList}>loading</div>
    }

    return (
        <div class={styles.bookList}>
            {books.map(b => (
                <BookCard book={b} />
            ))}
        </div>
    )
}
