import {
    allPagesFactory,
    apiFetch,
    encodeParams,
    PaginatedRequest,
    PaginatedResponse,
} from 'src/api/internal'
import { Series } from 'src/models'

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

interface SeriesUpdateRequest {
    anilist_id: number | null
    update_map: Record<string, string>
}

export async function update(
    name: string,
    req: SeriesUpdateRequest,
): Promise<Series> {
    return await apiFetch(`/api/series/${encodeURIComponent(name)}`, {
        method: 'POST',
        body: JSON.stringify(req),
    })
}
