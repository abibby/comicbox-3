import {
    apiFetch,
    encodeParams,
    PaginatedRequest,
    PaginatedResponse,
} from 'src/api/internal'
import { User } from 'src/models'
import { encode } from 'src/util'

export interface CreateRequest {
    username: string
    password: string
}

export async function create(
    req: CreateRequest,
    token: string | null,
): Promise<User> {
    let headers: HeadersInit | undefined

    if (token !== null) {
        headers = {
            Authorization: 'Bearer ' + token,
        }
    }

    return await apiFetch(
        '/api/users',
        {
            method: 'POST',
            body: JSON.stringify(req),
            headers: headers,
        },
        false,
    )
}

export type UserIndexRequest = PaginatedRequest & {
    id?: string
}

export async function index(
    req: UserIndexRequest = {},
): Promise<PaginatedResponse<User>> {
    return await apiFetch('/api/users?' + encodeParams(req), {})
}

export async function update(
    id: string,
    req: unknown = {},
): Promise<PaginatedResponse<User>> {
    return await apiFetch(encode`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(req),
    })
}
