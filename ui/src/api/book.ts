import { Dexie } from 'dexie';
import { DB } from '../database';
import { Book } from "../models";
import { apiFetch, encodeParams, PaginatedRequest, PaginatedResponse } from "./internal";

export type BookListRequest = 
    & PaginatedRequest
    & {
        id?: string
        series?: string
        before_id?: string
        after_id?: string
        order?: 'asc' | 'desc'
    }

export async function list(req: BookListRequest = {}): Promise<PaginatedResponse<Book>> {
    return await apiFetch("/api/books?" + encodeParams(req))
}

export async function cachedList(req: BookListRequest): Promise<Book[]> {
    if (req.id !== undefined) {
        
        return DB.books
            .where('id')
            .equals(req.id)
            .toArray()
    } 
    if (req.series !== undefined) {
        return DB.books
            .where(['series', 'sort'])
            .between([req.series, Dexie.minKey], [req.series, Dexie.maxKey])
            .toArray()
    } 
    
    return DB.books.orderBy('sort').toArray()
}
