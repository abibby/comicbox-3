import { route } from "preact-router"

export type PaginatedRequest = {
    page?: number
    page_size?: number
    updated_after?: string
}

export interface PaginatedResponse<T> {
    total: number
    page: number
    page_size: number
    data: T[]
}

export function encodeParams(req: Record<string, string|number|undefined>): string {
    const u = new URLSearchParams()

    for (const [key, value] of Object.entries(req)) {
        if (value !== undefined) {
            u.set(key, String(value))
        }
    }

    return u.toString()
}

export async function allPages<T, TRequest extends PaginatedRequest>(
    callback: (req: TRequest) => Promise<PaginatedResponse<T>>,
    req: TRequest
): Promise<T[]> {
    const items: T[] = []
    let page = 1
    let resp: PaginatedResponse<T>
    do {
        resp = await callback({
            page_size: 100,
            ...req,
            page: page,
        })

        items.push(...resp.data)
        
        page++
    } while (resp.page * resp.page_size < resp.total)

    return items
}

export class FetchError<T> extends Error {
    constructor(
        message: string,
        public status: number,
        public body: T,
    ) {
        super(message)
    }
}

let authToken = localStorage.getItem("auth-token")

export function setAuthToken(token: string | null): void {
    authToken = token
    if (token === null) {
        localStorage.removeItem("auth-token")
    } else {
        localStorage.setItem("auth-token", token)
    }
}

export async function apiFetch<T>(...args: Parameters<typeof fetch>): Promise<T> {
    if (authToken !== null){
        args[1] = {
            ...args[1],
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        }
    }
    const response = await fetch(...args)
    const body = await response.json()
    
    if (response.status === 401) {
        route('/login')
    }
    if (!response.ok) {
        let message = response.statusText
        if (body.error) {
            message = body.error
        }
        throw new FetchError(message, response.status, body)
    }
    return body
}
