import { seriesAPI } from 'src/api'
import { useCached } from 'src/cache'
import { DB } from 'src/database'
import { Series } from 'src/models'

export function useSeries(name: string): [Series | null, boolean] {
    const seriesList = useCached({
        listName: `series:${name}`,
        request: { name: name },
        table: DB.series,
        network: seriesAPI.list,
    })

    return [seriesList?.[0] ?? null, seriesList === null]
}
