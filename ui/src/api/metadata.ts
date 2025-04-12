import { encode } from 'src/util'
import { apiFetch } from 'src/api/internal'
import { Series, SeriesMetadata } from 'src/models'

export type MetadataListResponse = {
    data: SeriesMetadata[]
}

export async function metadataList(
    title: string,
): Promise<MetadataListResponse> {
    return await apiFetch(encode`/api/meta?title=${title}`)
}

export async function metadataUpdate(slug: string): Promise<Series> {
    return await apiFetch(encode`/api/meta/update/${slug}`, { method: 'POST' })
}
