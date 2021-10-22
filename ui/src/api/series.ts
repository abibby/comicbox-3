import { DB } from '../database'
import { Series } from '../models'
import {
    allPagesFactory,
    apiFetch,
    encodeParams,
    PaginatedRequest,
    PaginatedResponse,
} from './internal'

export const listNames = [
    ['reading', 'Reading'],
    ['paused', 'Paused'],
    ['dropped', 'Dropped'],
    ['completed', 'Completed'],
    ['planning', 'Planning'],
] as const

export type SeriesListRequest = PaginatedRequest & {
    name?: string
    list?: string
}

export async function listPaged(
    req: SeriesListRequest = {},
): Promise<PaginatedResponse<Series>> {
    return await apiFetch('/api/series?' + encodeParams(req))
}

export const list = allPagesFactory<Series, SeriesListRequest>(listPaged)

export async function cachedList(req: SeriesListRequest): Promise<Series[]> {
    if (req.name !== undefined) {
        return DB.series.where('name').equals(req.name).toArray()
    }

    if (req.list !== undefined) {
        return DB.series.where('user_series.list').equals(req.list).toArray()
    }

    return DB.series.orderBy('name').toArray()
}
