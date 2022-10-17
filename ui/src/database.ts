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

// eslint-disable-next-line @typescript-eslint/ban-types
function entries<T extends object>(o: T): [keyof T, T[keyof T]][] {
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
            seriecs: '&name, user_series.list, dirty',
            lastUpdated: '&list',
        })
        this.books = this.table('books')
        this.series = this.table('series')
        this.lastUpdated = this.table('lastUpdated')

        this.books.hook('updating', (mod: Partial<DBBook>, id, b) => {
            // const newMod = this.modelUpdating(b, mod)
            // console.log('updating', b.file, newMod)
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

    public async saveBook(b: DBBook, mod: Modification<DBBook>): Promise<void> {
        await this.books.update(
            b,
            this.modelModification(b, mod, emptyBook, updatedTimestamp()),
        )
    }

    public async saveSeries(
        s: DBSeries,
        mod: Modification<DBSeries>,
    ): Promise<void> {
        await this.series.update(
            s,
            this.modelModification(s, mod, emptySeries, updatedTimestamp()),
        )
    }

    private modelModification<T extends DBModel>(
        model: Readonly<T>,
        modification: Readonly<Modification<T>>,
        empty: Readonly<T>,
        timestamp: string,
    ): Modification<T> {
        const updateMap: UpdateMap<T> = { ...model.update_map }
        let dirty = model.dirty ?? 0

        for (const [key] of entries(modification)) {
            if (isDBModel(empty[key])) {
                if (model[key] === null) {
                    model = {
                        ...model,
                        [key]: empty[key],
                    }
                }

                const subModification = this.modelModification(
                    model[key],
                    modification[key] as Readonly<Modification<DBModel>>,
                    empty[key],
                    timestamp,
                )
                modification = {
                    ...modification,
                    [key]: subModification,
                }
                // console.log('subModification', subModification)

                dirty = dirty | ((subModification.dirty ?? 0) << 1)
            } else if (modification[key] !== model[key]) {
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
        const updatedItems = items.filter(i => i.deleted_at === null)
        const oldItems = await table.bulkGet(
            updatedItems.map(v => ('id' in v ? v.id : v.name)),
        )
        await table.bulkPut(
            updatedItems.map((v, i): T => {
                const oldItem = oldItems[i]
                if (oldItem === undefined) {
                    return { ...v, dirty: 0 }
                }
                return {
                    ...updateNewerFields(oldItem, v),
                    dirty: 0,
                }
            }),
        )
    }
}

export let DB = new AppDatabase()

function isDBModel(v: unknown): v is DBModel {
    return typeof v === 'object' && v !== null && 'update_map' in v
}

function updateNewerFields<T extends DBModel>(oldValue: T, newValue: T): T {
    const newMap: UpdateMap<T> = newValue.update_map ?? {}
    const oldMap: UpdateMap<T> = oldValue.update_map ?? {}

    const combinedValue: T = { ...oldValue }
    for (const [key, newV] of entries(newValue)) {
        const oldV = oldValue[key]

        if (isDBModel(oldV)) {
            combinedValue[key] = updateNewerFields(oldV, newV)
        } else {
            const oldMapKey = oldMap[key]
            const newMapKey = newMap[key]

            if (
                oldMapKey === undefined ||
                (newMapKey !== undefined && newMapKey > oldMapKey)
            ) {
                combinedValue[key] = newV
            }
        }
    }
    return combinedValue
}
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
