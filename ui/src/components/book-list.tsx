import { FunctionalComponent, h } from 'preact'
import { Book } from '../models'
import { BookCard } from './book-card'
import styles from './book-list.module.css'

interface BookListProps {
    books: Book[]
    // listName: string
    // series?: string
}

export const BookList: FunctionalComponent<BookListProps> = props => {
    return (
        <div class={styles.bookList}>
            {props.books.map(b => (
                <BookCard book={b} />
            ))}
        </div>
    )
}
