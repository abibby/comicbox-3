import Dexie, { DBCoreMutateRequest } from 'dexie'
import { Book, List, PageType, Series, UserBook, UserSeries } from 'src/models'

type UpdateMap<T> = {
    [P in keyof T]?: string
}

type Modification<T> = {
    [P in keyof T]?: T[P] extends DBModel ? Modification<T[P]> : T[P]
}
type Update<T> = {
    [P in keyof T]?: T[P] extends DBModel ? never : T[P]
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
            seriecs: '&name, user_series.list, dirty',
            lastUpdated: '&list',
        })
        this.books = this.table('books')
        this.series = this.table('series')
        this.lastUpdated = this.table('lastUpdated')

        this.books.hook('updating', (mod: Update<DBBook>, id, b) => {
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

    // private modelUpdating<T extends DBModel>(
    //     model: Readonly<T>,
    //     mod: Readonly<Update<T>>,
    // ): Update<T> {
    //     const newMod: Update<T> = {}
    //     for (const [key, value] of entries(mod)) {
    //         if (typeof key !== 'string') {
    //             continue
    //         }
    //         let modUpdateMap: Record<string, unknown> = mod.update_map ?? {}
    //         let modelUpdateMap: Record<string, unknown> = model.update_map ?? {}
    //         const parts = key.split('.').slice(0, -1)
    //         if (parts.length > 1) {
    //             continue
    //         }
    //         const updateMapKey = parts[parts.length - 1]!
    //         const subObject = parts.join('.')
    //         if (subObject.length > 0) {
    //             modUpdateMap = mod[subObject + '.update_map']
    //             modelUpdateMap = model[subObject].update_map
    //         }
    //         if (
    //             (modUpdateMap[updateMapKey] ?? '0') >=
    //             (modelUpdateMap[updateMapKey] ?? '0')
    //         ) {
    //             newMod[key] = mod[key]
    //         }
    //     }
    //     console.log('modelUpdating', newMod)

    //     return newMod
    // }

    // private updateMapValue(v: any, key: string) {

    // }

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

function isDBModel(v: unknown): v is DBModel {
    return typeof v === 'object' && v !== null && 'update_map' in v
}
function n(
    changeSpec: Record<string, any>,
    value: Record<string, any>,
): Record<string, any> {
    console.log(changeSpec, value)

    const newValue = { ...value }
    for (const [key, change] of entries(changeSpec)) {
        if (isDBModel(value[key])) {
            newValue[key] = n(change, value[key])
        } else {
            const changeMap = changeSpec.update_map ?? {}
            const valueMap = value.update_map ?? {}
            if (changeMap[key] > valueMap[key]) {
                newValue[key] = change
            } else if (key === 'current_page') {
                console.log(key, changeMap, valueMap, changeSpec, value)
            }
        }
    }
    return newValue
}

function mutate(req: Readonly<DBCoreMutateRequest>): DBCoreMutateRequest {
    if (req.type !== 'put') {
        return req
    }

    const changes =
        req.changeSpec !== undefined ? [req.changeSpec] : req.changeSpecs

    const myRequest: DBCoreMutateRequest = {
        ...req,
        values: req.values.map((v, i) => n(changes?.[i] ?? {}, v)),
    }

    return myRequest
}

DB.use({
    stack: 'dbcore',
    name: 'MyMiddleware',
    create(downlevelDatabase) {
        return {
            ...downlevelDatabase,
            table(tableName) {
                const downlevelTable = downlevelDatabase.table(tableName)
                return {
                    ...downlevelTable,
                    mutate: async req => {
                        return await downlevelTable.mutate(mutate(req))
                    },
                }
            },
        }
    },
})

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
