import {
    allPagesFactory,
    apiFetch,
    encodeParams,
    PaginatedRequest,
    PaginatedResponse,
} from 'src/api/internal'
import { List, Series, SeriesOrder, SeriesUpdateRequest } from 'src/models'

export const listNames: [List, string][] = [
    [List.Reading, 'Reading'],
    [List.Paused, 'Paused'],
    [List.Dropped, 'Dropped'],
    [List.Completed, 'Completed'],
    [List.Planning, 'Planning'],
]

export const listNamesMap = new Map<List, string>(listNames)

export type SeriesListRequest = PaginatedRequest & {
    slug?: string
    list?: string
    order_by?: SeriesOrder
    order?: 'asc' | 'desc'
}

export async function listPaged(
    req: SeriesListRequest = {},
): Promise<PaginatedResponse<Series>> {
    return await apiFetch('/api/series?' + encodeParams(req))
}

export const list = allPagesFactory<Series, SeriesListRequest>(listPaged)

export async function update(
    slug: string,
    req: SeriesUpdateRequest,
): Promise<Series> {
    return await apiFetch(`/api/series/${encodeURIComponent(slug)}`, {
        method: 'POST',
        body: JSON.stringify(req),
    })
}
