import { UserSeries } from '../models'
import { apiFetch } from './internal'

interface UserSeriesUpdateRequest {
    list: string | null
}

export async function update(
    name: string,
    req: UserSeriesUpdateRequest,
): Promise<UserSeries> {
    return await apiFetch(`/api/series/${name}/user-series`, {
        method: 'POST',
        body: JSON.stringify(req),
    })
}