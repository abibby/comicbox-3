import Dexie from 'dexie'
import { Book, Series } from './models'

interface LastUpdated {
    list: string
    updatedAt: string
}

class AppDatabase extends Dexie {
    books: Dexie.Table<Book, number>
    series: Dexie.Table<Series, number>
    lastUpdated: Dexie.Table<LastUpdated, number>

    constructor() {
        super('AppDatabase')
        this.version(1).stores({
            books: '&id, [series+sort], sort',
            series: '&name',
            lastUpdated: '&list',
        })
        this.books = this.table('books')
        this.series = this.table('series')
        this.lastUpdated = this.table('lastUpdated')
    }
}

export let DB = new AppDatabase()

export function clearDatabase(): void {
    DB.delete()
    DB = new AppDatabase()
}
