import { FunctionalComponent, h } from 'preact'
import { series } from '../api'
import { useCached } from '../cache'
import { SeriesList } from '../components/series-list'
import { DB } from '../database'

export const SeriesIndex: FunctionalComponent = () => {
    const s = useCached(
        'series-index',
        {},
        DB.series,
        series.list,
        series.cachedList,
    )

    return (
        <div>
            <h1>Series</h1>
            <SeriesList series={s ?? []} />
        </div>
    )
}
