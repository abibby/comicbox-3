import { apiFetch } from 'src/api/internal'

export type BookListRequest = {
    message: string
    level: string
    attrs: Record<string, unknown>
}

export async function log(req: BookListRequest): Promise<void> {
    return await apiFetch(
        '/api/rum',
        {
            method: 'POST',
            body: JSON.stringify(req),
        },
        false,
    )
}
