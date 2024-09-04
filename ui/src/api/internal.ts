import noImage from 'res/images/no-cover.svg'
import { Mutex } from 'async-mutex'
import { del, get, set } from 'idb-keyval'
import { route } from 'preact-router'
import { LoginResponse } from 'src/api/auth'
import jwt, { JWT } from 'src/jwt'
import { Book, Page, Series } from 'src/models'

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

export type AllPagesRequest<T> = T & {
    limit?: number
}

export async function allPages<T, TRequest extends PaginatedRequest>(
    callback: (req: TRequest) => Promise<PaginatedResponse<T>>,
    req: AllPagesRequest<TRequest>,
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
): (req: AllPagesRequest<TRequest>) => Promise<T[]> {
    return req => allPages(callback, req)
}

export class FetchError<T> extends Error {
    constructor(message: string, public status: number, public body: T) {
        super(message)
    }
}

let tokens: LoginResponse | undefined

export async function setAuthToken(
    resp: LoginResponse | null | undefined,
): Promise<void> {
    tokens = resp ?? undefined
    if (resp === null || resp === undefined) {
        await del('tokens')
    } else {
        await set('tokens', resp)
    }
}

const refreshTokenMutex = new Mutex()

async function getTokens(): Promise<LoginResponse | undefined> {
    if (tokens === undefined) {
        tokens = await get<LoginResponse>('tokens')
    }
    if (tokens) {
        if (
            isExpired(jwt.parse(tokens.token)) &&
            !isExpired(jwt.parse(tokens.refresh_token))
        ) {
            await refreshTokenMutex.runExclusive(async () => {
                if (tokens && isExpired(jwt.parse(tokens.token))) {
                    try {
                        const resp = await fetch('/api/login/refresh', {
                            method: 'POST',
                            headers: {
                                Authorization: 'Bearer ' + tokens.refresh_token,
                            },
                        })

                        if (resp.ok) {
                            tokens = await resp.json()
                            await setAuthToken(tokens)
                        }
                    } catch {
                        // noop
                    }
                }
            })
        }
    }

    return tokens
}

function isExpired(token: JWT): boolean {
    return Date.now() / 1000 - Number(token.claims.exp) > -60
}

export async function getAuthToken(): Promise<string | null> {
    const t = await getTokens()
    return t?.token ?? null
}
export async function getAuthImageToken(): Promise<string | null> {
    const t = await getTokens()
    return t?.image_token ?? null
}

export async function pageURL(
    model: Book | Series | Page,
    page?: number,
    { thumbnail = false, encode = false } = {},
): Promise<string> {
    let u: URL
    if ('url' in model) {
        if (thumbnail) {
            u = new URL(model.thumbnail_url, location.href)
        } else {
            u = new URL(model.url, location.href)
        }
    } else if ('pages' in model && page !== undefined) {
        if (model.id === '') {
            return noImage
        }
        const p = model.pages[page]
        if (p === undefined) {
            return noImage
        }
        if (thumbnail) {
            u = new URL(p.thumbnail_url, location.href)
        } else {
            u = new URL(p.url, location.href)
        }
    } else {
        u = new URL(model.cover_url, location.href)
    }

    const token = await getAuthImageToken()
    if (token !== null) {
        u.searchParams.set('_token', token)
    }

    if (encode) {
        u.searchParams.set('encode', 'true')
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
