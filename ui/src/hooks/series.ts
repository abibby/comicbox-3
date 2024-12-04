import { seriesAPI } from 'src/api'
import { SeriesListRequest } from 'src/api/series'
import { CacheOptions, useCached } from 'src/cache'
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

export function useSeriesList(
    listName: string,
    request: SeriesListRequest,
    options: Partial<CacheOptions<Series, seriesAPI.SeriesListRequest>> = {},
): [Series[], boolean] {
    const seriesList = useCached({
        listName: `series:${listName}`,
        request: request,
        table: DB.series,
        network: seriesAPI.list,
        ...options,
    })

    return [seriesList ?? [], seriesList === null]
}

export function useAllSeries() {
    return useSeriesList('all', {})
}
