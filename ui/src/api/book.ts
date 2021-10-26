import { Collection, Dexie } from 'dexie'
import { DB } from '../database'
import { Book, PageType } from '../models'
import {
    allPagesFactory,
    AllPagesRequest,
    apiFetch,
    encodeParams,
    PaginatedRequest,
    PaginatedResponse,
} from './internal'

export type BookListRequest = PaginatedRequest & {
    id?: string
    series?: string
    before_id?: string
    after_id?: string
    order?: 'asc' | 'desc'
}

export async function listPaged(
    req: BookListRequest = {},
): Promise<PaginatedResponse<Book>> {
    return await apiFetch('/api/books?' + encodeParams(req))
}

export const list = allPagesFactory<Book, BookListRequest>(listPaged)

export async function cachedList(
    req: BookListRequest & AllPagesRequest,
): Promise<Book[]> {
    if (req.id !== undefined) {
        return DB.books.where('id').equals(req.id).toArray()
    }
    let collection: Collection<Book, number> | undefined
    let beforeSort = Dexie.maxKey
    let afterSort: string | number = Dexie.minKey

    if (req.after_id !== undefined) {
        const b = await DB.books.where('id').equals(req.after_id).first()
        if (b === undefined) {
            return []
        }
        afterSort = b.sort
    }
    if (req.before_id !== undefined) {
        const b = await DB.books.where('id').equals(req.before_id).first()
        if (b === undefined) {
            return []
        }
        beforeSort = b.sort
    }
    if (req.series !== undefined) {
        collection = DB.books
            .where(['series', 'sort'])
            .between(
                [req.series, afterSort],
                [req.series, beforeSort],
                false,
                false,
            )
    }

    if (collection === undefined) {
        collection = DB.books.where('sort').between(afterSort, beforeSort)
    }

    if (req.limit !== undefined) {
        collection = collection.limit(req.limit)
    }
    if (req.order === 'desc') {
        collection = collection.reverse()
    }

    return collection.toArray()
}

export async function readingPaged(
    req: PaginatedRequest = {},
): Promise<PaginatedResponse<Book>> {
    return await apiFetch('/api/books/reading?' + encodeParams(req))
}
export const reading = allPagesFactory<Book, BookListRequest>(readingPaged)

function notNullish<T>(v: T | null | undefined): v is T {
    return v !== null && v !== undefined
}

export async function cachedReading(
    req: PaginatedRequest = {},
): Promise<Book[]> {
    const s = await DB.series
        .where('user_series.list')
        .equals('reading')
        .toArray()

    const bookPromises = s.map(s =>
        DB.books
            .where(['series', 'completed', 'sort'])
            .between([s.name, 0, Dexie.minKey], [s.name, 0, Dexie.maxKey])
            .first(),
    )
    const books = await Promise.all(bookPromises)
    return books.filter(notNullish)
}

export interface BookUpdateRequest {
    title: string
    series: string
    volume: number | null
    chapter: number | null
    rtl: boolean
    pages: BookPageUpdate[]
}

export interface BookPageUpdate {
    type: PageType
}

export async function update(
    id: string,
    req: BookUpdateRequest,
): Promise<Book> {
    return await apiFetch(`/api/books/${id}`, {
        method: 'POST',
        body: JSON.stringify(req),
    })
}
