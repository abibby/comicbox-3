import { FunctionalComponent, h } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { book } from '../api'
import { allPages } from '../api/pagination'
import { DB } from '../database'
import { Book } from '../models'
import { prompt } from './alert'
import { BookCard } from './book'
import styles from './book-list.module.css'

interface BookListProps {

}

export const BookList: FunctionalComponent<BookListProps> = props => {
    // const netBooks = useAsync(book.list, [])
    // const cacheBooks = useAsync(() => DB.books.toArray(), [])
    const [books, setBooks] = useState<Book[]>([])

    useEffect(() => {
        (async () => {
            const cacheBooks = await DB.books.toArray()
            if (cacheBooks.length === 0) {
                const netBooks = await allPages(book.list, {})
                setBooks(netBooks)
                DB.books.bulkPut(netBooks)
            } else {
                setBooks(cacheBooks)
                const netBooks = await allPages(book.list, { updated_after: new Date() })
                if (netBooks.length === 0) {
                    return
                }
                DB.books.bulkPut(netBooks)

                const reload = await prompt("New books", { reload: true })
                if (reload) {
                    setBooks(await DB.books.toArray())
                }
            }
        })()
    }, [setBooks])

    return <div class={styles.bookList}>
        {books.map(b => <BookCard book={b} />)}
    </div>
}
