import { seriesAPI } from 'src/api'
import { AllPagesRequest } from 'src/api/internal'
import { CacheOptions, useCached } from 'src/cache'
import { seriesCache } from 'src/cache/series'
import { DB } from 'src/database'
import { Series } from 'src/models'

export function useSeriesList(
    listName: string,
    request: AllPagesRequest<seriesAPI.SeriesListRequest>,
    options: Partial<
        CacheOptions<Series, AllPagesRequest<seriesAPI.SeriesListRequest>>
    > = {},
): [Series[], boolean] {
    const seriesList = useCached({
        listName: `series:${listName}`,
        request: request,
        table: DB.series,
        network: seriesAPI.list,
        cache: seriesCache,
        ...options,
    })

    return [seriesList ?? [], seriesList === null]
}

export function useSeries(slug: string): [Series | null, boolean] {
    const [series, loading] = useSeriesList(
        `slug:${slug}`,
        { slug: slug, limit: null },
        { wait: !slug },
    )
    return [series[0] ?? null, loading]
}

export function useAllSeries(
    options: Partial<
        CacheOptions<Series, AllPagesRequest<seriesAPI.SeriesListRequest>>
    > = {},
) {
    return useSeriesList('all', { limit: null }, options)
}
