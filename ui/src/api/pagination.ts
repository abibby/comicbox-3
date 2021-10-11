export type PaginatedRequest = {
    page?: number
    page_size?: number
    updated_after?: Date
}

export interface PaginatedResponse<T> {
    total: number
    page: number
    page_size: number
    data: T[]
}

export function encodeParams(req: Record<string, string|number|Date|undefined>): string {
    const u = new URLSearchParams()

    for (const [key, value] of Object.entries(req)) {
        if (value !== undefined) {
            if (value instanceof Date) {
                u.set(key, value.toISOString())
            } else {
                u.set(key, String(value))
            }
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
    while (true) {
        const resp = await callback({
            page_size: 10,
            ...req,
            page: page,
        })

        items.push(...resp.data)

        if (resp.page * resp.page_size > resp.total) {
            return items
        }

        page++
    }
}