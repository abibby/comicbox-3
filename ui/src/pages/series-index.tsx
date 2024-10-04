import { Fragment, FunctionalComponent, h } from 'preact'
import { seriesAPI } from 'src/api'
import { useCached } from 'src/cache'
import { SeriesList } from 'src/components/series-list'
import { DB } from 'src/database'

export const SeriesIndex: FunctionalComponent = () => {
    const s = useCached({
        listName: 'series-index',
        request: {},
        table: DB.series,
        network: seriesAPI.list,
    })

    return (
        <Fragment>
            <h1>Series</h1>
            <SeriesList scroll='vertical' series={s} />
        </Fragment>
    )
}
