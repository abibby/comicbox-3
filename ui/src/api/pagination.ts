export type PaginatedRequest = {
    page?: number
    page_size?: number
    since?: string
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