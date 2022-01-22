import noImage from 'asset-url:../../res/images/no-cover.svg'
import { get, set } from 'idb-keyval'
import { route } from 'preact-router'
import { Book, Page, Series } from '../models'

export type PaginatedRequest = {
    page?: number
    page_size?: number
    with_deleted?: boolean
    updated_after?: string
}

export interface PaginatedResponse<T> {
    total: number
    page: number
    page_size: number
    data: T[]
}

export function encodeParams(
    req: Record<string, string | number | boolean | undefined>,
): string {
    const u = new URLSearchParams()

    for (const [key, value] of Object.entries(req)) {
        if (value !== undefined) {
            u.set(key, String(value))
        }
    }

    return u.toString()
}

export interface AllPagesRequest {
    limit?: number
}

export async function allPages<T, TRequest extends PaginatedRequest>(
    callback: (req: TRequest) => Promise<PaginatedResponse<T>>,
    req: TRequest & AllPagesRequest,
): Promise<T[]> {
    const items: T[] = []
    let page = 1
    let resp: PaginatedResponse<T>
    do {
        let pageSize = 100
        if (req.limit !== undefined && page * pageSize > req.limit) {
            pageSize = req.limit % pageSize
        }
        resp = await callback({
            page_size: pageSize,
            ...req,
            page: page,
        })

        items.push(...resp.data)

        page++
    } while (resp.page * resp.page_size < (req.limit ?? resp.total))

    return items
}

export function allPagesFactory<T, TRequest extends PaginatedRequest>(
    callback: (req: TRequest) => Promise<PaginatedResponse<T>>,
): (req: TRequest & AllPagesRequest) => Promise<T[]> {
    return req => allPages(callback, req)
}

export class FetchError<T> extends Error {
    constructor(message: string, public status: number, public body: T) {
        super(message)
    }
}

let authToken: string | null | undefined
let authImageToken: string | null | undefined

export async function setAuthToken(
    token: string | null,
    imageToken: string | null,
): Promise<void> {
    authToken = token
    authImageToken = imageToken
    await Promise.all([
        set('auth-token', token),
        set('auth-image-token', imageToken),
    ])
}
export async function getAuthToken(): Promise<string | null> {
    if (authToken !== undefined) {
        return authToken
    }
    const token = await get<string | null>('auth-token')
    authToken = token ?? null
    return authToken
}
export async function getAuthImageToken(): Promise<string | null> {
    if (authImageToken !== undefined) {
        return authImageToken
    }
    const token = await get<string | null>('auth-image-token')
    authImageToken = token ?? null
    return authImageToken
}

export async function pageURL(
    model: Book | Series | Page,
    page?: number,
): Promise<string> {
    let u: URL
    if ('url' in model) {
        u = new URL(model.url, location.href)
    } else if ('pages' in model && page !== undefined) {
        if (model.id === '') {
            return noImage
        }
        const p = model.pages[page]
        if (p === undefined) {
            return noImage
        }
        u = new URL(p.url, location.href)
    } else {
        u = new URL(model.cover_url, location.href)
    }
    const token = await getAuthImageToken()
    if (token !== null) {
        u.searchParams.set('_token', token)
    }

    return u.toString()
}

export async function apiFetch<T>(
    input: RequestInfo,
    init?: RequestInit,
    redirectOn401 = true,
): Promise<T> {
    const token = await getAuthToken()
    if (token !== null) {
        init = {
            ...init,
            headers: {
                Authorization: 'Bearer ' + token,
            },
        }
    }
    const response = await fetch(input, init)
    const body = await response.json()

    if (redirectOn401 && response.status === 401) {
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
