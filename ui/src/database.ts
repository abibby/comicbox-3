import Dexie from 'dexie'
import { Book, List, PageType, Series, UserBook, UserSeries } from 'src/models'

type UpdateMap<T> = {
    [P in keyof T]?: string
}

type Modification<T> = {
    [P in keyof T]?: T[P] extends DBModel
        ? Modification<T[P]>
        : T[P] extends DBModel | null
        ? Modification<Exclude<T[P], null>> | null
        : T[P]
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
        user_book: DBUserBook | null
    }

export type DBUserSeries = UserSeries & DBModel

export type DBSeries = Series &
    DBModel & {
        completed?: number
        downloaded?: boolean
        user_series: DBUserSeries | null
    }

export const emptyUserSeries: Readonly<UserSeries> = {
    created_at: '1970-01-01T00:00:00Z',
    updated_at: '1970-01-01T00:00:00Z',
    deleted_at: null,
    update_map: {},
    list: List.None,
    last_read_at: '1970-01-01T00:00:00Z',
    latest_book_id: null,
    latest_book: null,
}
export const emptySeries: Readonly<DBSeries> = {
    created_at: '1970-01-01T00:00:00Z',
    updated_at: '1970-01-01T00:00:00Z',
    deleted_at: null,
    update_map: {},
    slug: '',
    name: '',
    aliases: [],
    description: '',
    cover_url: '',
    user_series: emptyUserSeries,
    metadata_id: null,
    genres: [],
    tags: [],
    year: null,
    directory: '',
    locked_fields: [],
}

export const emptyUserBook: Readonly<UserBook> = {
    created_at: '1970-01-01T00:00:00Z',
    updated_at: '1970-01-01T00:00:00Z',
    deleted_at: null,
    update_map: {},
    current_page: 0,
}
export const emptyBook: Readonly<DBBook> = {
    created_at: '1970-01-01T00:00:00Z',
    updated_at: '1970-01-01T00:00:00Z',
    deleted_at: null,
    update_map: {},
    id: '',
    title: '',
    chapter: null,
    volume: null,
    series_slug: '',
    authors: [],
    pages: [],
    page_count: 0,
    rtl: false,
    long_strip: false,
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
    completed: 0,
    series: null,
}

function objectEntries<T extends object>(o: T): [keyof T, T[keyof T]][] {
    return Object.entries(o) as [keyof T, T[keyof T]][]
}

function objectKeys<T extends object>(o: T): (keyof T)[] {
    return Object.keys(o) as (keyof T)[]
}

class AppDatabase extends Dexie {
    books: Dexie.Table<DBBook, string>
    series: Dexie.Table<DBSeries, string>
    lastUpdated: Dexie.Table<LastUpdated, number>

    constructor() {
        super('comicbox')
        this.version(1).stores({
            books: '&id, [series_slug+sort], [series_slug+completed+sort], sort, dirty, created_at',
            series: '&slug, name, user_series.list, dirty, [user_series.list+user_series.last_read_at], user_series.last_read_at, created_at',
            lastUpdated: '&list',
        })
        this.books = this.table('books')
        this.series = this.table('series')
        this.lastUpdated = this.table('lastUpdated')

        this.series.hook('creating', (_id, s) => {
            s.dirty = 0
            if (s.user_series) {
                s.user_series.dirty = 0
            }
            return s
        })

        this.books.hook('creating', (_id, b) => {
            b.completed = this.bookComplete(b, {})
            b.dirty = 0
            if (b.user_book) {
                b.user_book.dirty = 0
            }
            return b
        })

        this.books.hook('updating', (mod: Partial<DBBook>, _id, b) => {
            return {
                ...mod,
                completed: this.bookComplete(b, mod),
                cover_url:
                    mod.pages?.find(p => p.type === PageType.FrontCover)
                        ?.thumbnail_url ??
                    mod.pages?.find(p => p.type !== PageType.Deleted)
                        ?.thumbnail_url ??
                    b.cover_url,
            }
        })
    }

    public async saveBook(
        b: DBBook,
        mod: Modification<DBBook>,
        setDirty = true,
    ): Promise<void> {
        await this.books.update(
            b,
            this.modelModification(
                b,
                mod,
                emptyBook,
                updatedTimestamp(),
                setDirty,
            ),
        )
    }

    public async saveSeries(
        s: DBSeries,
        mod: Modification<DBSeries>,
        setDirty = true,
    ): Promise<void> {
        const mod2 = this.modelModification(
            s,
            mod,
            emptySeries,
            updatedTimestamp(),
            setDirty,
        )
        await this.series.update(s, mod2)
    }

    private modelModification<T extends DBModel>(
        model: Readonly<T>,
        modification: Readonly<Modification<T>>,
        empty: Readonly<T>,
        timestamp: string,
        setDirty: boolean,
    ): Modification<T> {
        const updateMap: UpdateMap<T> = { ...model.update_map }
        let dirty = model.dirty ?? 0

        for (const key of objectKeys(modification)) {
            if (isDBModel(empty[key])) {
                if (model[key] === null) {
                    model = {
                        ...model,
                        [key]: empty[key],
                    }
                }

                const subModification = this.modelModification(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    model[key] as any,
                    modification[key] as Readonly<Modification<DBModel>>,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    empty[key] as any,
                    timestamp,
                    setDirty,
                )
                modification = {
                    ...modification,
                    [key]: subModification,
                }

                dirty = dirty | ((subModification.dirty ?? 0) << 1)
            } else if (modification[key] !== model[key]) {
                updateMap[key] = timestamp
                dirty = dirty | 1
            }
        }

        if (!setDirty) {
            dirty = model.dirty ?? 0
        }
        return {
            ...modification,
            dirty: dirty,
            update_map: updateMap,
        }
    }

    private bookComplete(b: DBBook, mod: Partial<DBBook> = {}): number {
        const currentPage =
            mod.user_book?.current_page ?? b.user_book?.current_page ?? 0
        const pageCount = mod.page_count ?? b.page_count

        if (currentPage < pageCount - 1) {
            return 0
        }
        return 1
    }

    public async fromNetwork(items: (DBSeries | DBBook)[]): Promise<void> {
        const allBooks: DBBook[] = items.filter(isBook)
        const allSeries: DBSeries[] = items.filter(isSeries)
        const readBookPromises: Promise<void>[] = []

        await this.books.bulkDelete(
            allBooks.filter(i => i.deleted_at !== null).map(v => v.id),
        )
        await this.series.bulkDelete(
            allSeries.filter(i => i.deleted_at !== null).map(v => v.slug),
        )
        const books = allBooks.filter(b => b.deleted_at === null)
        const series = allSeries.filter(s => s.deleted_at === null)

        const updatedBooks: DBBook[] = []
        const updatedSeries: DBSeries[] = []

        for (const book of books) {
            updatedBooks.push(book)
            if (book.series) {
                updatedSeries.push(book.series)
                book.series = null
            }
        }
        for (const s of series) {
            updatedSeries.push(s)
            readBookPromises.push(this.readBooks(s))

            if (s.user_series?.latest_book) {
                updatedBooks.push(s.user_series.latest_book)
                s.user_series.latest_book = null
                s.user_series.latest_book_id = null
            }
        }

        await Promise.all(readBookPromises)

        const oldBooks = await this.books.bulkGet(updatedBooks.map(v => v.id))
        const oldSeries = await this.series.bulkGet(
            updatedSeries.map(v => v.name),
        )

        await this.books.bulkPut(
            updatedBooks.map((v, i): DBBook => {
                const oldItem = oldBooks[i]
                if (oldItem === undefined) {
                    return { ...v, dirty: 0 }
                }
                return updateNewerFields(oldItem, v)
            }),
        )
        await this.series.bulkPut(
            updatedSeries.map((v, i): DBSeries => {
                const oldItem = oldSeries[i]
                if (oldItem === undefined) {
                    return { ...v, dirty: 0 }
                }
                return updateNewerFields(oldItem, v)
            }),
        )
    }

    async readBooks(s: Series) {
        if (!s.user_series?.latest_book_id) {
            return
        }

        const book = await this.books.get(s.user_series.latest_book_id)

        const unreadBooks = await this.books
            .where(['series_slug', 'completed', 'sort'])
            .between(
                [s.slug, 0, Dexie.minKey],
                [s.slug, 0, book?.sort ?? Dexie.maxKey],
            )
            .toArray()

        await this.books.bulkPut(
            unreadBooks.map(b => {
                b.user_book = {
                    ...emptyUserBook,
                    ...b.user_book,
                    current_page: b.page_count - 1,
                }
                return b
            }),
        )
    }
}

function isBook(m: DBSeries | DBBook): m is DBBook {
    return 'id' in m
}
function isSeries(m: DBSeries | DBBook): m is DBSeries {
    return !('id' in m)
}

export let DB = new AppDatabase()

function isDBModel(v: unknown): v is DBModel {
    return typeof v === 'object' && v !== null && 'update_map' in v
}

function updateNewerFields<T extends DBModel>(oldValue: T, newValue: T): T {
    const newMap: UpdateMap<T> = newValue.update_map ?? {}
    const oldMap: UpdateMap<T> = oldValue.update_map ?? {}
    let dirty = 0

    const combinedValue: T = { ...newValue }
    for (const [key, newV] of objectEntries(newValue)) {
        const oldV = oldValue[key]

        if (isDBModel(oldV) && isDBModel(newV)) {
            const subModel = updateNewerFields(oldV, newV)
            dirty = dirty | ((subModel.dirty ?? 0) << 1)

            combinedValue[key] = subModel
        } else {
            const oldMapKey = oldMap[key]
            const newMapKey = newMap[key]

            // Use the old value
            if (
                (oldMapKey !== undefined && newMapKey === undefined) ||
                (oldMapKey !== undefined &&
                    newMapKey !== undefined &&
                    newMapKey < oldMapKey)
            ) {
                combinedValue[key] = oldV
                combinedValue.update_map = {
                    ...combinedValue.update_map,
                    [key]: oldMapKey,
                }
                dirty |= 1
            }
        }
    }
    combinedValue.dirty = dirty

    return combinedValue
}
export function clearDatabase(): void {
    void DB.delete()
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
