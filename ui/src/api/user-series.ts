import { apiFetch } from 'src/api/internal'
import { UserSeries } from 'src/models'

interface UserSeriesUpdateRequest {
    list: string | null
    latest_book_id: string | null
    last_read_at: string | null
    update_map: Record<string, string>
}

export async function update(
    slug: string,
    req: UserSeriesUpdateRequest,
): Promise<UserSeries> {
    return await apiFetch(
        `/api/series/${encodeURIComponent(slug)}/user-series`,
        {
            method: 'POST',
            body: JSON.stringify(req),
        },
    )
}
