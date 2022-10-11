import { apiFetch } from 'src/api/internal'
import { UserSeries } from 'src/models'

interface UserSeriesUpdateRequest {
    list: string | null
    update_map: Record<string, string>
}

export async function update(
    name: string,
    req: UserSeriesUpdateRequest,
): Promise<UserSeries> {
    return await apiFetch(
        `/api/series/${encodeURIComponent(name)}/user-series`,
        {
            method: 'POST',
            body: JSON.stringify(req),
        },
    )
}
