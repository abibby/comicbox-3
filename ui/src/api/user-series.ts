import { apiFetch } from 'src/api/internal'
import { UserSeriesUpdateRequest, UserSeries } from 'src/models'

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
