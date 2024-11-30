import { seriesAPI } from 'src/api'
import { useCached } from 'src/cache'
import { DB } from 'src/database'
import { Series } from 'src/models'

export function useSeries(slug: string): [Series | null, boolean] {
    const seriesList = useCached({
        listName: `series:${slug}`,
        request: { slug: slug },
        table: DB.series,
        network: seriesAPI.list,
    })

    return [seriesList?.[0] ?? null, seriesList === null]
}
