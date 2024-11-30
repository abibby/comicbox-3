import { apiFetch } from 'src/api/internal'
import { UserSeries } from 'src/models'

interface UserSeriesUpdateRequest {
    list: string | null
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
