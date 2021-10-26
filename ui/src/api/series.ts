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
