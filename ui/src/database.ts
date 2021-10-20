import Dexie from 'dexie'
import { Book, Series } from './models'

interface LastUpdated {
    list: string
    updatedAt: string
}

type DBBook = Book & { completed: number }

class AppDatabase extends Dexie {
    books: Dexie.Table<DBBook, number>
    series: Dexie.Table<Series, number>
    lastUpdated: Dexie.Table<LastUpdated, number>

    constructor() {
        super('AppDatabase')
        this.version(1).stores({
            books: '&id, [series+sort], [series+completed+sort], sort',
            series: '&name, user_series.list',
            lastUpdated: '&list',
        })
        this.books = this.table('books')
        this.series = this.table('series')
        this.lastUpdated = this.table('lastUpdated')

        this.books.hook(
            'creating',
            (id, b) => (b.completed = this.bookComplete(b)),
        )
        this.books.hook('updating', (mod, id, b) => ({
            ...mod,
            completed: this.bookComplete(b),
        }))
    }

    bookComplete(b: DBBook): number {
        if (
            b.user_book === null ||
            b.user_book.current_page < b.page_count - 1
        ) {
            return 0
        }
        return 1
    }
}

export let DB = new AppDatabase()

export function clearDatabase(): void {
    DB.delete()
    DB = new AppDatabase()
}
