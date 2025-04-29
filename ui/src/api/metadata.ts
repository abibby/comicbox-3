import { encode } from 'src/util'
import { apiFetch } from 'src/api/internal'
import { DistanceMetadata, Series } from 'src/models'

export type MetadataListResponse = {
    data: DistanceMetadata[]
}

export async function metadataList(
    title: string,
    signal?: AbortSignal,
): Promise<MetadataListResponse> {
    return await apiFetch(encode`/api/meta?title=${title}`, {
        signal: signal,
    })
}

export async function metadataUpdate(slug: string): Promise<Series> {
    return await apiFetch(encode`/api/meta/update/${slug}`, { method: 'POST' })
}

export async function metadataSync(): Promise<Series> {
    return await apiFetch(encode`/api/meta/sync`, { method: 'POST' })
}
