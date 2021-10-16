import { DB } from '../database'
import { Series } from '../models'
import {
    allPagesFactory,
    apiFetch,
    encodeParams,
    PaginatedRequest,
    PaginatedResponse,
} from './internal'

export type SeriesListRequest = PaginatedRequest & {
    name?: string
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

    return DB.series.orderBy('name').toArray()
}
