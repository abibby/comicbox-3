import Dexie from 'dexie'
import { Book, Series, UserBook, UserSeries } from './models'

type UpdateMap<T> = {
    [P in keyof T]?: string
}

type Modification<T> = {
    [P in keyof T]?: Modification<T[P]>
}

interface LastUpdated {
    list: string
    updatedAt: string
}

export interface DBModel {
    clean?: number
    update_map?: UpdateMap<this>
}

export type DBUserBook = UserBook & DBModel

export type DBBook = Book &
    DBModel & {
        completed?: number
        user_book: DBUserBook | null
    }

export type DBUserSeries = UserSeries & DBModel

export type DBSeries = Series &
    DBModel & {
        completed?: number
        user_series: DBUserSeries | null
    }

function entries<T>(o: T): [keyof T, T[keyof T]][] {
    return Object.entries(o) as [keyof T, T[keyof T]][]
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
            console.log(mod)

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

    public async saveBook(b: DBBook, mod: Modification<DBBook>): Promise<void> {
        const updateMap: UpdateMap<DBBook> = b.update_map ?? {}
        for (const [key] of entries(mod)) {
            if (key === 'user_book' && mod.user_book) {
                if (b.user_book === null) {
                    b.user_book = {
                        updated_at: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        deleted_at: null,
                        current_page: 0,
                    }
                }

                const ubUpdateMap: UpdateMap<DBUserBook> =
                    b.user_book.update_map ?? {}

                for (const [ubKey] of entries(mod.user_book)) {
                    if (mod.user_book[ubKey] !== b.user_book[ubKey]) {
                        ubUpdateMap[ubKey] = new Date().toISOString()
                    }
                }
                mod.user_book.update_map = ubUpdateMap
            } else if (mod[key] !== b[key]) {
                updateMap[key] = new Date().toISOString()
            }
        }
        mod.update_map = updateMap
        DB.books.update(b, mod)
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
