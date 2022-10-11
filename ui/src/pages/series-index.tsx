import { FunctionalComponent, h } from 'preact'
import { series } from 'src/api'
import { useCached } from 'src/cache'
import { SeriesList } from 'src/components/series-list'
import { DB } from 'src/database'

export const SeriesIndex: FunctionalComponent = () => {
    const s = useCached('series-index', {}, DB.series, series.list)

    return (
        <div>
            <h1>Series</h1>
            <SeriesList series={s} />
        </div>
    )
}
