import {
    AccessToken,
    AccessTokenCreateRequest,
    AccessTokenCreateResponse,
} from 'src/models'
import { apiFetch } from 'src/api/internal'
import { encode } from 'src/util'

export async function index(): Promise<AccessToken[]> {
    return await apiFetch(`/api/access-token`, {})
}

export async function create(
    req: AccessTokenCreateRequest,
): Promise<AccessTokenCreateResponse> {
    return await apiFetch(`/api/access-token`, {
        method: 'POST',
        body: JSON.stringify(req),
    })
}

export async function remove(id: string): Promise<AccessToken> {
    return await apiFetch(encode`/api/access-token/${id}`, {
        method: 'DELETE',
    })
}
