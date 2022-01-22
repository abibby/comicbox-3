import { User } from '../models'
import { apiFetch } from './internal'

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
