import { DB } from '../database';
import { Series } from "../models";
import { encodeParams, PaginatedRequest, PaginatedResponse } from "./pagination";

export type BookListRequest = 
    & PaginatedRequest
    & {
        name?: string
    }

export async function list(req: BookListRequest = {}): Promise<PaginatedResponse<Series>> {
    return await fetch("/api/series?" + encodeParams(req)).then(r => r.json())
}

export async function cachedList(req: BookListRequest): Promise<Series[]> {
    if (req.name !== undefined) {
        return DB.series
            .where('name')
            .equals(req.name)
            .toArray()
    }

    return DB.series.orderBy('name').toArray()
}