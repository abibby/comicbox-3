import Dexie from 'dexie'
import { book, userBook, userSeries } from './api'
import { invalidateCache } from './cache'
import { Book, Series } from './models'
import { onActivate } from './page-lifecycle'

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

    public async persist(fromUserInteraction: boolean): Promise<void> {
        const dirtyBooks = await DB.books.where('clean').equals(0).toArray()
        for (const b of dirtyBooks) {
            if (b.user_book !== null) {
                await userBook.update(b.id, {
                    current_page: b.user_book.current_page,
                })
            }
            const result = await book.update(b.id, {
                title: b.title,
                series: b.series,
                chapter: b.chapter,
                volume: b.volume,
            })
            DB.books.put({
                ...result,
                clean: 1,
            })
        }
        const dirtySeries = await DB.series.where('clean').equals(0).toArray()
        for (const s of dirtySeries) {
            if (s.user_series !== null) {
                const us = await userSeries.update(s.name, {
                    list: s.user_series.list,
                })
                DB.series.update(s, { user_series: us, clean: 1 })
            }
        }
        invalidateCache(fromUserInteraction)
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
    onActivate(true)
}
