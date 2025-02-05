import { apiFetch } from 'src/api/internal'

export type LogRequest = {
    message: string
    level: string
    attrs: Record<string, unknown>
}

export async function log(req: LogRequest): Promise<void> {
    return await apiFetch(
        '/api/rum',
        {
            method: 'POST',
            body: JSON.stringify(req),
        },
        false,
    )
}
