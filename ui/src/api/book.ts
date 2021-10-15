import { Collection, Dexie } from 'dexie';
import { DB } from '../database';
import { Book } from "../models";
import { allPagesFactory, AllPagesRequest, apiFetch, encodeParams, PaginatedRequest, PaginatedResponse } from "./internal";

export type BookListRequest = 
    & PaginatedRequest
    & {
        id?: string
        series?: string
        before_id?: string
        after_id?: string
        order?: 'asc' | 'desc'
    }

export async function listPaged(req: BookListRequest = {}): Promise<PaginatedResponse<Book>> {
    return await apiFetch("/api/books?" + encodeParams(req))
}

export const list = allPagesFactory<Book, BookListRequest>(listPaged)

export async function cachedList(req: BookListRequest & AllPagesRequest): Promise<Book[]> {
    let collection: Collection<Book, number>
    if (req.id !== undefined) {
        collection = DB.books
            .where('id')
            .equals(req.id)
    } else if (req.after_id !== undefined) {
        const b = await DB.books
            .where('id')
            .equals(req.after_id)
            .first()
        if (b === undefined) {
            return []
        }
        collection = DB.books
            .where('sort')
            .above(b.sort)
    } else if (req.before_id !== undefined) {
        const b = await DB.books
            .where('id')
            .equals(req.before_id)
            .first()
        if (b === undefined) {
            return []
        }
        collection = DB.books
            .where('sort')
            .below(b.sort)
            .reverse()
    } else if (req.series !== undefined) {
        collection = DB.books
            .where(['series', 'sort'])
            .between([req.series, Dexie.minKey], [req.series, Dexie.maxKey])
    } else {
        collection = DB.books.orderBy('sort')
    }

    if (req.limit !== undefined) {
        collection = collection.limit(req.limit)
    }

    return collection.toArray()
}
