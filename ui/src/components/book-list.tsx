import { FunctionalComponent, h } from 'preact'
import { Book } from '../models'
import { BookCard } from './book-card'
import styles from './book-list.module.css'
import { Card } from './card'

interface BookListProps {
    books: Book[] | null
}

export const BookList: FunctionalComponent<BookListProps> = props => {
    if (props.books === null) {
        return (
            <div class={styles.bookList}>
                <Card title='title' subtitle='subtitle' placeholder />
            </div>
        )
    }

    return (
        <div class={styles.bookList}>
            {props.books.map(b => (
                <BookCard book={b} />
            ))}
        </div>
    )
}
