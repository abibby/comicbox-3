import noImage from 'res/images/no-cover.svg'
import { del, get, set } from 'idb-keyval'
import { LoginResponse } from 'src/api/auth'
import jwt, { Claims, JWT } from 'src/jwt'
import { Book, Page, Series } from 'src/models'
import { computed, signal } from '@preact/signals-core'
import { Mutex } from 'async-mutex'
import slog from 'src/slog'

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

const tokens = signal<LoginResponse>()

export const claims = computed((): Claims | undefined => {
    if (!tokens.value) {
        return undefined
    }
    return jwt.parse(tokens.value.token).claims
})

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
    limit: number | null
}

export async function allPages<T, TRequest extends PaginatedRequest>(
    callback: (req: TRequest) => Promise<PaginatedResponse<T>>,
    options: AllPagesRequest<TRequest>,
): Promise<T[]> {
    const items: T[] = []
    let page = 1
    let resp: PaginatedResponse<T>
    const { limit, ...req } = options
    do {
        let pageSize = 100
        if (limit !== null && page * pageSize > limit) {
            pageSize = limit % pageSize
        }
        resp = await callback({
            ...(req as unknown as TRequest),
            page_size: pageSize,
            page: page,
        })

        items.push(...resp.data)

        page++
    } while (resp.page * resp.page_size < (limit ?? resp.total))

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

export async function setAuthToken(
    resp: LoginResponse | null | undefined,
): Promise<void> {
    if (resp === null || resp === undefined) {
        await del('tokens')
    } else {
        await set('tokens', resp)
    }
}

const refreshTokenMutex = new Mutex()

async function getTokens(): Promise<LoginResponse | undefined> {
    if (tokens.value === undefined) {
        tokens.value = await get<LoginResponse>('tokens')
    }
    if (tokens.value) {
        if (
            isExpired(jwt.parse(tokens.value.token)) &&
            !isExpired(jwt.parse(tokens.value.refresh_token))
        ) {
            await refreshTokenMutex.runExclusive(async () => {
                if (tokens.value && isExpired(jwt.parse(tokens.value.token))) {
                    try {
                        const resp = await fetch('/api/login/refresh', {
                            method: 'POST',
                            headers: {
                                Authorization:
                                    'Bearer ' + tokens.value.refresh_token,
                            },
                        })

                        if (!resp.ok) {
                            slog.Warn('failed to refresh auth tokens', {
                                response: await resp.json(),
                            })
                            return
                        }
                        tokens.value = await resp.json()
                        await setAuthToken(tokens.value)
                    } catch (e) {
                        slog.Warn('failed to refresh auth tokens', {
                            err: e,
                        })
                    }
                }
            })
        }
    }

    return tokens.value
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
    init = addHeader(init, 'Accept', 'application/json')
    init = addHeader(init, 'Content-Type', 'application/json')
    const token = await getAuthToken()
    if (token !== null) {
        init = addHeader(init, 'Authorization', 'Bearer ' + token)
    }
    const response = await fetch(input, init)
    const body = await response.json()

    if (redirectOn401 && response.status === 401) {
        location.href = '/login'
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

function addHeader(
    init: RequestInit | undefined,
    name: string,
    value: string,
): RequestInit {
    if (init === undefined) {
        init = {}
    }
    let headers = init.headers
    if (headers === undefined) {
        headers = {}
    }
    if (headers instanceof Array) {
        headers.push([name, value])
    } else if (headers instanceof Headers) {
        headers.append(name, value)
    } else {
        headers[name] = value
    }
    init.headers = headers

    return init
}
