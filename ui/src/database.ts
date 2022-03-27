import Dexie from 'dexie'
import { Book, List, PageType, Series, UserBook, UserSeries } from './models'

type UpdateMap<T> = {
    [P in keyof T]?: string
}

type Modification<T> = {
    [P in keyof T]?: T extends DBModel ? Modification<T[P]> : T[P]
}

interface LastUpdated {
    list: string
    updatedAt: string
}

export interface DBModel {
    dirty?: number
    update_map?: UpdateMap<this>
}

export type DBUserBook = UserBook & DBModel

export type DBBook = Book &
    DBModel & {
        completed?: number
        downloaded?: boolean
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
        this.version(2).stores({
            books: '&id, [series+sort], [series+completed+sort], sort, dirty, created_at',
            series: '&name, user_series.list, dirty',
            lastUpdated: '&list',
        })
        this.version(1).stores({
            books: '&id, [series+sort], [series+completed+sort], sort, dirty',
            series: '&name, user_series.list, dirty',
            lastUpdated: '&list',
        })
        this.books = this.table('books')
        this.series = this.table('series')
        this.lastUpdated = this.table('lastUpdated')

        this.books.hook('creating', (id, b) => {
            b.completed = this.bookComplete(b)
            b.dirty = 0
        })
        this.books.hook('updating', (mod: Partial<DBBook>, id, b) => {
            return {
                ...mod,
                completed: this.bookComplete(b, mod),
                cover_url:
                    mod.pages?.find(p => p.type !== PageType.Deleted)?.url ??
                    b.cover_url,
            }
        })

        this.series.hook('creating', (id, s) => {
            s.dirty = 0
        })
        this.series.hook('updating', mod => {
            return {
                dirty: 1,
                ...mod,
            }
        })
    }

    public async saveBook(b: DBBook, mod: Modification<DBBook>): Promise<void> {
        const updateMap: UpdateMap<DBBook> = b.update_map ?? {}
        let bookHasChanges = false
        let userBookHasChanges = false
        const timestamp = updatedTimestamp()
        for (const [key] of entries(mod)) {
            if (key === 'user_book' && mod.user_book) {
                if (b.user_book === null) {
                    b.user_book = {
                        updated_at: timestamp,
                        created_at: timestamp,
                        deleted_at: null,
                        current_page: 0,
                        update_map: {},
                    }
                }

                const ubUpdateMap: UpdateMap<DBUserBook> =
                    b.user_book.update_map ?? {}

                for (const [ubKey] of entries(mod.user_book)) {
                    if (mod.user_book[ubKey] !== b.user_book[ubKey]) {
                        ubUpdateMap[ubKey] = timestamp
                        userBookHasChanges = true
                    }
                }
                mod.user_book.update_map = ubUpdateMap
                if (userBookHasChanges) {
                    mod.user_book.dirty = 1
                }
            } else if (mod[key] !== b[key]) {
                updateMap[key] = timestamp
                bookHasChanges = true
            }
        }
        mod.update_map = updateMap
        if (bookHasChanges) {
            mod.dirty = 1
        } else if (userBookHasChanges) {
            mod.dirty = 2
        }

        await DB.books.update(b, mod)
    }

    public async saveSeries(
        s: DBSeries,
        mod: Modification<DBSeries>,
    ): Promise<void> {
        const updateMap: UpdateMap<DBSeries> = s.update_map ?? {}
        let bookHasChanges = false
        let userBookHasChanges = false
        const timestamp = updatedTimestamp()
        for (const [key] of entries(mod)) {
            if (key === 'user_series' && mod.user_series) {
                if (s.user_series === null) {
                    s.user_series = {
                        updated_at: timestamp,
                        created_at: timestamp,
                        deleted_at: null,
                        list: List.None,
                        update_map: {},
                    }
                }

                const ubUpdateMap: UpdateMap<DBUserSeries> =
                    s.user_series.update_map ?? {}

                for (const [ubKey] of entries(mod.user_series)) {
                    if (mod.user_series[ubKey] !== s.user_series[ubKey]) {
                        ubUpdateMap[ubKey] = timestamp
                        userBookHasChanges = true
                    }
                }
                mod.user_series.update_map = ubUpdateMap
                if (userBookHasChanges) {
                    mod.user_series.dirty = 1
                }
            } else if (mod[key] !== s[key]) {
                updateMap[key] = timestamp
                bookHasChanges = true
            }
        }
        mod.update_map = updateMap
        if (bookHasChanges) {
            mod.dirty = 1
        } else if (userBookHasChanges) {
            mod.dirty = 2
        }

        await DB.series.update(s, mod)
    }

    private bookComplete(b: DBBook, mod: Partial<DBBook> = {}): number {
        const currentPage =
            mod.user_book?.current_page ?? b.user_book?.current_page ?? 0
        const pageCount =
            mod.page_count ?? b.page_count ?? Number.MAX_SAFE_INTEGER

        if (currentPage < pageCount - 1) {
            return 0
        }
        return 1
    }

    public async fromNetwork<T extends DBSeries | DBBook>(
        table: Dexie.Table<T>,
        items: T[],
    ): Promise<void> {
        await table.bulkDelete(
            items
                .filter(i => i.deleted_at !== null)
                .map(v => {
                    if ('id' in v) {
                        return v.id
                    }
                    return v.name
                }),
        )
        await table.bulkPut(
            items
                .filter(i => i.deleted_at === null)
                .map(v => ({
                    ...v,
                    dirty: 0,
                })),
        )
    }
}

export let DB = new AppDatabase()

export function clearDatabase(): void {
    DB.delete()
    DB = new AppDatabase()
}
function randomString(length: number): string {
    // Declare all characters
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    // Pick characers randomly
    let str = ''
    for (let i = 0; i < length; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return str
}
let updateIndex = 0
const clientID = randomString(8)

function updatedTimestamp(): string {
    updateIndex++
    return `${Date.now()}-${clientID}-${updateIndex}`
}
