import { seriesAPI } from 'src/api'
import { SeriesListRequest } from 'src/api/series'
import { CacheOptions, useCached } from 'src/cache'
import { DB } from 'src/database'
import { Series } from 'src/models'

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

export function useSeries(slug: string): [Series | null, boolean] {
    const [series, loading] = useSeriesList(slug, { slug: slug })
    return [series[0] ?? null, loading]
}

export function useAllSeries(
    options: Partial<CacheOptions<Series, seriesAPI.SeriesListRequest>> = {},
) {
    return useSeriesList('all', {}, options)
}
