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

const emptySeries: Readonly<DBSeries> = {
    created_at: '1970-01-01T00:00:00Z',
    updated_at: '1970-01-01T00:00:00Z',
    deleted_at: null,
    update_map: {},
    name: '',
    cover_url: '',
    first_book_id: null,
    user_series: {
        created_at: '1970-01-01T00:00:00Z',
        updated_at: '1970-01-01T00:00:00Z',
        deleted_at: null,
        update_map: {},
        list: List.None,
    },
    anilist_id: null,
}

const emptyBook: Readonly<DBBook> = {
    created_at: '1970-01-01T00:00:00Z',
    updated_at: '1970-01-01T00:00:00Z',
    deleted_at: null,
    update_map: {},
    id: '',
    title: '',
    chapter: null,
    volume: null,
    series: '',
    authors: [],
    pages: [],
    page_count: 0,
    rtl: false,
    sort: '',
    file: '',
    cover_url: '',
    user_book: {
        created_at: '1970-01-01T00:00:00Z',
        updated_at: '1970-01-01T00:00:00Z',
        deleted_at: null,
        update_map: {},
        current_page: 0,
    },
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
                    mod.pages?.find(p => p.type !== PageType.Deleted)
                        ?.thumbnail_url ?? b.cover_url,
            }
        })

        this.series.hook('creating', (id, s) => {
            s.dirty = 0
        })
        // this.series.hook('updating', mod => {
        //     return {
        //         ...mod,
        //     }
        // })
    }

    public async saveBook(b: DBBook, mod: Modification<DBBook>): Promise<void> {
        await DB.books.update(
            b,
            this.saveModel(b, mod, emptyBook, updatedTimestamp()),
        )
    }

    public async saveSeries(
        s: DBSeries,
        mod: Modification<DBSeries>,
    ): Promise<void> {
        await DB.series.update(
            s,
            this.saveModel(s, mod, emptySeries, updatedTimestamp()),
        )
    }

    private saveModel<T extends DBModel>(
        b: Readonly<T>,
        modification: Readonly<Modification<T>>,
        empty: Readonly<T>,
        timestamp: string,
    ): Modification<T> {
        const updateMap: UpdateMap<T> = { ...b.update_map }
        let dirty = 0

        for (const [key] of entries(modification)) {
            if (this.isDBModel(empty[key])) {
                if (b[key] === null) {
                    b = {
                        ...b,
                        [key]: empty[key],
                    }
                }

                const subModification = this.saveModel(
                    b[key],
                    modification[key] as Readonly<Modification<DBModel>>,
                    empty[key],
                    timestamp,
                )
                modification = {
                    ...modification,
                    [key]: subModification,
                }

                dirty = dirty | ((subModification.dirty ?? 0) << 1)
            } else if (modification[key] !== b[key]) {
                updateMap[key] = timestamp
                dirty = dirty | 1
            }
        }

        return {
            ...modification,
            dirty: dirty,
            update_map: updateMap,
        }
    }

    private isDBModel(v: unknown): v is DBModel {
        return typeof v === 'object' && v !== null && 'update_map' in v
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
