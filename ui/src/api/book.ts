import { Dexie } from 'dexie';
import { DB } from '../database';
import { Book } from "../models";
import { encodeParams, PaginatedRequest, PaginatedResponse } from "./pagination";

export type BookListRequest = 
    & PaginatedRequest
    & {
        id?: string
        series?: string
    }

export async function list(req: BookListRequest = {}): Promise<PaginatedResponse<Book>> {
    return await fetch("/api/books?" + encodeParams(req)).then(r => r.json())
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