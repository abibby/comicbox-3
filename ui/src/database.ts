import Dexie from 'dexie'
import { Book, Series } from './models'

interface LastUpdated {
    list: string
    updatedAt: string
}

interface DBModel {
    clean?: number
}

interface DBBook extends Book {
    completed?: number
    clean?: number
}

interface DBSeries extends Series {
    clean?: number
}

class AppDatabase extends Dexie {
    books: Dexie.Table<DBBook, number>
    series: Dexie.Table<DBSeries, number>
    lastUpdated: Dexie.Table<LastUpdated, number>

    constructor() {
        super('AppDatabase')
        this.version(1).stores({
            books: '&id, [series+sort], [series+completed+sort], sort, clean',
            series: '&name, user_series.list, clean',
            lastUpdated: '&list',
        })
        this.books = this.table('books')
        this.series = this.table('series')
        this.lastUpdated = this.table('lastUpdated')

        this.books.hook('creating', (id, b) => {
            b.completed = this.bookComplete(b)
            b.clean = 1
        })
        this.books.hook('updating', (mod, id, b) => {
            return {
                clean: 0,
                ...mod,
                completed: this.bookComplete(b),
            }
        })

        this.series.hook('creating', (id, s) => {
            s.clean = 1
        })
        this.series.hook('updating', mod => {
            return {
                clean: 0,
                ...mod,
            }
        })
    }

    private bookComplete(b: DBBook): number {
        if (
            b.user_book === null ||
            b.user_book.current_page < b.page_count - 1
        ) {
            return 0
        }
        return 1
    }

    public async fromNetwork<T extends DBModel>(
        table: Dexie.Table<T>,
        items: T[],
    ): Promise<void> {
        table.bulkPut(
            items.map(v => ({
                ...v,
                clean: 1,
            })),
        )
    }
}

export let DB = new AppDatabase()

export function clearDatabase(): void {
    DB.delete()
    DB = new AppDatabase()
}
