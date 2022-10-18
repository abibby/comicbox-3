import { FunctionalComponent, h } from 'preact'
import { BookCard } from 'src/components/book-card'
import styles from 'src/components/book-list.module.css'
import { Card } from 'src/components/card'
import { Book } from 'src/models'

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
                <BookCard key={b.id} book={b} />
            ))}
        </div>
    )
}
